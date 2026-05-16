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
        
        // Log to diagnostics regardless of score
        FinancialNotificationPlugin.logTransactionAttempt(context, parsedInfo)

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

        // Show Overlay if confidence is at least 65 (threshold) or if it's a clear transaction even with missing fields
        // We allow popup even for "unknown" merchant as long as it looks like a transaction
        if (parsedInfo.confidenceScore >= 65 || (parsedInfo.amount > 0 && parsedInfo.type != "unknown" && parsedInfo.confidenceScore >= 50)) {
            triggerOverlay(context, parsedInfo)
        } else {
            Log.d(TAG, "[$source] FILTERED: Confidence score (${parsedInfo.confidenceScore}) below popup threshold (65).")
        }
    }

    private fun triggerOverlay(context: Context, info: ParsedTransactionInfo) {
        if (Settings.canDrawOverlays(context)) {
            Log.d(TAG, "Triggering TransactionOverlayService instantly for ${info.merchant}")
            val intent = Intent(context, TransactionOverlayService::class.java).apply {
                putExtra("amount", info.amount)
                putExtra("merchant", info.merchant)
                putExtra("appName", info.sourceApp)
                putExtra("rawText", info.rawText)
                putExtra("type", info.type)
                putExtra("confidenceScore", info.confidenceScore)
                putExtra("account", info.account)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            try {
                context.startService(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Failed launching TransactionOverlayService", e)
            }
        } else {
            Log.w(TAG, "Overlay trigger skipped: SYSTEM_ALERT_WINDOW permission not granted.")
        }
    }
}
