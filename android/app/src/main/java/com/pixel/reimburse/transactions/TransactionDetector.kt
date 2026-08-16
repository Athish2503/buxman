package com.pixel.reimburse.transactions

import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.util.Log
import com.pixel.reimburse.FinancialNotificationPlugin
import java.util.concurrent.ConcurrentHashMap

object TransactionDetector {
    private const val TAG = "TRANSACTION_DEBUG"
    private const val DEDUPE_WINDOW_MS = 30000L // 30 seconds deduplication window across Notification, Accessibility, and SMS

    private val recentTransactions = ConcurrentHashMap<String, Long>()

    fun processTransactionContent(context: Context, text: String, packageName: String?, title: String?, source: String) {
        Log.d(TAG, "[$source] captured raw payload: text=[$text], package=[$packageName], title=[$title]")

        val parsedInfo = TransactionParser.parseTransaction(text, packageName, title, source)
        
        // Reject unknown types early if they are neither debit nor credit transactions
        if (parsedInfo.type != "debit" && parsedInfo.type != "credit") {
            Log.d(TAG, "[$source] REJECTED: Not a debit or credit transaction (Type: ${parsedInfo.type})")
            FinancialNotificationPlugin.logRejection(context, text, source, "Not a debit or credit transaction", parsedInfo.matchedKeywords)
            return
        }

        val lowerRaw = text.lowercase()
        val isMicroOrVerification = parsedInfo.amount <= 1.0 || 
                lowerRaw.contains("mandate") || 
                lowerRaw.contains("verification") || 
                lowerRaw.contains("penny drop") || 
                lowerRaw.contains("auth")

        // Overlay is accepted if not promotional, not micro/verification, confidence is >= 40, and valid amount
        val accepted = !parsedInfo.isPromotional &&
                !isMicroOrVerification &&
                parsedInfo.confidenceScore >= 40 &&
                (parsedInfo.confidenceScore >= 50 || parsedInfo.amount > 0)

        // Log to diagnostics regardless of score
        FinancialNotificationPlugin.logTransactionAttempt(context, parsedInfo, accepted)

        if (parsedInfo.isPromotional || isMicroOrVerification) {
            val reason = if (parsedInfo.isPromotional) "Promotional content detected" else "Micro-transaction or verification message suppressed from popup"
            Log.d(TAG, "[$source] REJECTED: $reason (Score: ${parsedInfo.confidenceScore})")
            FinancialNotificationPlugin.logRejection(context, text, source, reason, parsedInfo.matchedKeywords)
            return
        }

        if (parsedInfo.confidenceScore < 40) {
            Log.d(TAG, "[$source] REJECTED: Confidence score (${parsedInfo.confidenceScore}) way too low.")
            FinancialNotificationPlugin.logRejection(context, text, source, "Extremely low confidence", parsedInfo.matchedKeywords)
            return
        }

        // Deduplication Check
        val dedupeKey = "${parsedInfo.amount.toInt()}_${parsedInfo.merchant.lowercase()}"
        val now = System.currentTimeMillis()

        // Clean up stale cache keys
        recentTransactions.entries.removeIf { now - it.value > DEDUPE_WINDOW_MS }

        if (!source.startsWith("Simulated")) {
            if (recentTransactions.containsKey(dedupeKey)) {
                Log.d(TAG, "DEDUPE LOG: Duplicate transaction suppressed within window: $dedupeKey")
                return
            }
            recentTransactions[dedupeKey] = now
        }

        Log.i(TAG, "SUCCESSFUL CAPTURE [$source]: Amount=${parsedInfo.amount}, Merchant=${parsedInfo.merchant}, Score=${parsedInfo.confidenceScore}")

        // Alert the Capacitor Bridge (for the app UI)
        FinancialNotificationPlugin.onTransactionCaptured(context, parsedInfo)

        // Show standard notification alert
        try {
            com.pixel.reimburse.NotificationHelper.showTransactionNotification(
                context = context,
                rawText = parsedInfo.rawText,
                amount = parsedInfo.amount,
                merchant = parsedInfo.merchant,
                type = parsedInfo.type
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to show transaction notification", e)
        }

        // Show Overlay if accepted
        if (accepted) {
            triggerOverlay(context, parsedInfo)
        } else {
            Log.d(TAG, "[$source] FILTERED: Confidence score (${parsedInfo.confidenceScore}) below popup threshold.")
        }
    }

    private fun triggerOverlay(context: Context, info: ParsedTransactionInfo) {
        val isSimulated = info.extractionSource.startsWith("Simulated")
        if (isSimulated || Settings.canDrawOverlays(context)) {
            Log.d(TAG, "Triggering TransactionOverlayService to display transaction popup for ${info.merchant} (Simulated: $isSimulated)")
            val intent = Intent(context, TransactionOverlayService::class.java).apply {
                putExtra("amount", info.amount)
                putExtra("merchant", info.merchant)
                putExtra("appName", info.sourceApp)
                putExtra("rawText", info.rawText)
                putExtra("type", info.type)
                putExtra("confidenceScore", info.confidenceScore)
                putExtra("account", info.account ?: "")
            }
            try {
                context.startService(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Failed launching TransactionOverlayService directly", e)
            }
        } else {
            Log.w(TAG, "Overlay trigger skipped: SYSTEM_ALERT_WINDOW permission not granted.")
        }
    }
}
