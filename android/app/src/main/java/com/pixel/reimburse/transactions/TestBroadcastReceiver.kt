package com.pixel.reimburse.transactions

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.pixel.reimburse.FinancialNotificationPlugin

class TestBroadcastReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "TRANSACTION_DEBUG"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "TestBroadcastReceiver received: $action")

        when (action) {
            "com.pixel.reimburse.TEST_SMS" -> {
                val body = intent.getStringExtra("body") ?: "Your A/c XXXX is debited with INR 450.00 towards Zomato on 12-05-26. Ref: 987654321"
                val sender = intent.getStringExtra("sender") ?: "VM-HDFCBK"
                Log.d(TAG, "Simulating SMS from $sender")
                TransactionDetector.processTransactionContent(
                    context = context,
                    text = body,
                    packageName = sender,
                    title = "SMS Fallback",
                    source = "SimulatedSms"
                )
            }
            "com.pixel.reimburse.TEST_NOTIFICATION" -> {
                val title = intent.getStringExtra("title") ?: "GPay"
                val text = intent.getStringExtra("text") ?: "Paid ₹850 to Zomato"
                val pkg = intent.getStringExtra("package") ?: "com.google.android.apps.nbu.paisa.user"
                Log.d(TAG, "Simulating Notification from $pkg")
                TransactionDetector.processTransactionContent(
                    context = context,
                    text = "$title $text",
                    packageName = pkg,
                    title = title,
                    source = "SimulatedNotification"
                )
            }
            "com.pixel.reimburse.TEST_OVERLAY" -> {
                val amount = intent.getStringExtra("amount")?.toDoubleOrNull() ?: 1250.0
                val merchant = intent.getStringExtra("merchant") ?: "STARBUCKS"
                val appName = intent.getStringExtra("appName") ?: "GPay"
                
                Log.d(TAG, "Simulating Overlay for $merchant")
                val overlayIntent = Intent(context, TransactionOverlayService::class.java).apply {
                    putExtra("amount", amount)
                    putExtra("merchant", merchant)
                    putExtra("appName", appName)
                    putExtra("rawText", "Simulated via ADB")
                }
                context.startService(overlayIntent)
            }
        }
    }
}
