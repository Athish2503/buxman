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
        
        // Reject credits and unknown types early if the user only wants deducted/debit messages
        if (parsedInfo.type != "debit") {
            Log.d(TAG, "[$source] REJECTED: Not a debit/deducted transaction (Type: ${parsedInfo.type})")
            FinancialNotificationPlugin.logRejection(context, text, source, "Not a debit/deducted transaction", parsedInfo.matchedKeywords)
            return
        }

        // Overlay is accepted if confidence is >= 50 or if we have a valid amount, confidence >= 40, and not promotional
        val accepted = !parsedInfo.isPromotional &&
                parsedInfo.confidenceScore >= 40 &&
                (parsedInfo.confidenceScore >= 50 || parsedInfo.amount > 0)

        // Log to diagnostics regardless of score
        FinancialNotificationPlugin.logTransactionAttempt(context, parsedInfo, accepted)

        if (parsedInfo.isPromotional) {
            Log.d(TAG, "[$source] REJECTED: Promotional content detected (Score: ${parsedInfo.confidenceScore})")
            FinancialNotificationPlugin.logRejection(context, text, source, "Promotional content detected", parsedInfo.matchedKeywords)
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
            Log.d(TAG, "Triggering OverlayActivity to display transaction popup for ${info.merchant} (Simulated: $isSimulated)")
            val intent = Intent(context, OverlayActivity::class.java).apply {
                putExtra("amount", info.amount)
                putExtra("merchant", info.merchant)
                putExtra("appName", info.sourceApp)
                putExtra("rawText", info.rawText)
                putExtra("type", info.type)
                putExtra("confidenceScore", info.confidenceScore)
                putExtra("account", info.account ?: "")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
            try {
                context.startActivity(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Failed launching OverlayActivity directly", e)
            }
        } else {
            Log.w(TAG, "Overlay trigger skipped: SYSTEM_ALERT_WINDOW permission not granted.")
        }
    }
}
