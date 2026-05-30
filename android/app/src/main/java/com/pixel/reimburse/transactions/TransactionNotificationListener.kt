package com.pixel.reimburse.transactions

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class TransactionNotificationListener : NotificationListenerService() {
    companion object {
        private const val TAG = "TRANSACTION_DEBUG"
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        processNotification(sbn, "NotificationPosted")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification, rankingMap: RankingMap) {
        processNotification(sbn, "NotificationPosted(Updated)")
    }

    private fun processNotification(sbn: StatusBarNotification?, eventType: String) {
        if (sbn == null) return
        val packageName = sbn.packageName ?: return

        // Skip non-relevant core system UI notifications to avoid unnecessary background processing
        if (packageName == getPackageName() || packageName.contains("android.systemui") || packageName.contains("launcher")) {
            return
        }

        val notification = sbn.notification ?: return
        val extras = notification.extras ?: return

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""
        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString() ?: ""

        // Log ALL extras for thorough diagnostic debugging
        Log.d(TAG, "[$eventType] Extra Details Dump for package [$packageName]:")
        for (key in extras.keySet()) {
            Log.d(TAG, "   Extra Key [$key] = [${extras.get(key)}]")
        }

        val combinedPayload = "$title $text $bigText $subText".trim()
        if (combinedPayload.isBlank()) return

        // Dynamically allow default SMS app, messaging services, and banking/UPI apps
        val lowerPkg = packageName.lowercase()
        val defaultSmsApp = android.provider.Settings.Secure.getString(contentResolver, "sms_default_application")
        val isSmsApp = packageName == defaultSmsApp ||
                lowerPkg.contains("messaging") ||
                lowerPkg.contains("sms") ||
                lowerPkg.contains("mms") ||
                lowerPkg.contains("message") ||
                lowerPkg == "com.google.android.apps.messaging" ||
                lowerPkg == "com.android.messaging"

        val isFinanceApp = lowerPkg.contains("paisa") || // GPay
                lowerPkg.contains("phonepe") ||
                lowerPkg.contains("paytm") ||
                lowerPkg.contains("upi") ||
                lowerPkg.contains("bank") ||
                lowerPkg.contains("card") ||
                lowerPkg.contains("wallet") ||
                lowerPkg.contains("finance") ||
                lowerPkg.contains("money") ||
                lowerPkg.contains("pay") ||
                lowerPkg.contains("dreamplug") || // Cred
                lowerPkg.contains("slice") ||
                lowerPkg.contains("navi") ||
                lowerPkg.contains("hdfc") ||
                lowerPkg.contains("icici") ||
                lowerPkg.contains("axis") ||
                lowerPkg.contains("sbi") ||
                lowerPkg.contains("kotak") ||
                lowerPkg.contains("indusind") ||
                lowerPkg.contains("rbl") ||
                lowerPkg.contains("idfc") ||
                lowerPkg.contains("onecard")

        if (!isSmsApp && !isFinanceApp) {
            Log.d(TAG, "[$eventType] Ignored package: $packageName (not a target SMS or finance app)")
            return
        }

        Log.d(TAG, "[$eventType] Processing payload: [$combinedPayload]")

        TransactionDetector.processTransactionContent(
            context = this,
            text = combinedPayload,
            packageName = packageName,
            title = title,
            source = "NotificationListener"
        )
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.i(TAG, "TransactionNotificationListener Successfully Bound & Active.")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.w(TAG, "TransactionNotificationListener Disconnected.")
    }
}
