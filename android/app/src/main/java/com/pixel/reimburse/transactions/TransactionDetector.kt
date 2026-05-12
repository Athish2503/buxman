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

        val parsedInfo = TransactionParser.parseTransaction(text, packageName, title)
        if (parsedInfo == null) {
            Log.d(TAG, "[$source] payload parsing ignored/filtered.")
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

        // Alert the Capacitor Bridge
        FinancialNotificationPlugin.onTransactionCaptured(context, parsedInfo)

        // Show Overlay instantly if deduction is high-confidence
        if (parsedInfo.confidenceScore >= 50) {
            triggerOverlay(context, parsedInfo)
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
