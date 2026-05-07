package com.pixel.reimburse

import android.app.Notification
import android.content.Intent
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class NotificationListener : NotificationListenerService() {
    private val TAG = "NotificationListener"
    private val parser = TransactionParserEngine()

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName
        
        // Skip our own app and system apps
        if (packageName == getPackageName() || 
            packageName.contains("android.systemui") || 
            packageName.contains("android.providers")) {
            return
        }

        val notification = sbn.notification ?: return
        val extras = notification.extras ?: return
        
        val title = extras.getCharSequence(Notification.EXTRA_TITLE, "").toString()
        val text = extras.getCharSequence(Notification.EXTRA_TEXT, "").toString()
        val timestamp = sbn.postTime

        Log.d(TAG, "Notification received from $packageName: $title - $text")

        val transaction = parser.parse(packageName, title, text, timestamp)
        
        if (transaction != null) {
            Log.i(TAG, "Transaction detected: ${transaction.amount} at ${transaction.merchant}")
            
            // 1. Notify Capacitor Plugin
            FinancialNotificationPlugin.onTransactionDetected(transaction)
            
            // 2. Show Overlay if it's a debit transaction
            if (transaction.type == "debit") {
                showOverlay(transaction)
            }
        }
    }

    private fun showOverlay(transaction: ParsedTransaction) {
        // Check for overlay permission
        if (android.provider.Settings.canDrawOverlays(this)) {
            val intent = Intent(this, OverlayService::class.java).apply {
                putExtra("amount", transaction.amount)
                putExtra("merchant", transaction.merchant)
                putExtra("appName", transaction.appName)
                putExtra("timestamp", transaction.timestamp)
                putExtra("rawText", transaction.rawText)
            }
            startService(intent)
        } else {
            Log.w(TAG, "Cannot show overlay: Permission not granted")
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        // Not needed for now
    }
}
