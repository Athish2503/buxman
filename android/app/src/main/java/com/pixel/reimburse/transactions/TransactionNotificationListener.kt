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

        // Hard restrict allowed package names as per security requirements
        val isTarget = packageName == "com.google.android.apps.messaging" ||
                packageName == "com.android.messaging" ||
                packageName == "com.google.android.apps.sms"

        if (!isTarget) {
            Log.d(TAG, "[$eventType] Ignored package: $packageName (not an allowed SMS app)")
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
