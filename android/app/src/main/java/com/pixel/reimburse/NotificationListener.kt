package com.pixel.reimburse

import android.app.Notification
import android.content.Intent
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import java.util.concurrent.ConcurrentHashMap

class NotificationListener : NotificationListenerService() {
    private val TAG = "NotificationListener"
    private val parser = TransactionParserEngine()
    
    // Deduplication cache: Key = hash of amount+merchant+type, Value = timestamp
    private val dedupeCache = ConcurrentHashMap<String, Long>()
    private val CACHE_EXPIRY_MS = 30000 // 30 seconds

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName
        
        // 1. Basic Filtering
        if (shouldSkipPackage(packageName)) return

        val notification = sbn.notification ?: return
        val extras = notification.extras ?: return
        
        val title = extras.getCharSequence(Notification.EXTRA_TITLE, "").toString()
        val text = extras.getCharSequence(Notification.EXTRA_TEXT, "").toString()
        val timestamp = sbn.postTime

        // 2. Parse Transaction
        val transaction = parser.parse(packageName, title, text, timestamp)
        
        if (transaction != null) {
            // 3. Deduplication (important for SMS + App notification overlap)
            if (isDuplicate(transaction)) {
                Log.d(TAG, "Duplicate transaction ignored: ${transaction.amount} to ${transaction.merchant}")
                return
            }

            Log.i(TAG, "Transaction detected [Confidence: ${transaction.confidence}%]: ${transaction.amount} at ${transaction.merchant}")
            
            // 4. Notify Capacitor Plugin (Real-time update if app is open)
            FinancialNotificationPlugin.onTransactionDetected(transaction)
            
            // 5. Trigger Premium Overlay
            // We show overlay for all debits with reasonable confidence
            if (transaction.type == "debit" && transaction.confidence >= 60) {
                showOverlay(transaction)
            }
        }
    }

    private fun shouldSkipPackage(packageName: String): Boolean {
        val myPackage = packageName
        return packageName == getPackageName() || 
               packageName.contains("android.systemui") || 
               packageName.contains("android.providers") ||
               packageName.contains("launcher")
    }

    private fun isDuplicate(tx: ParsedTransaction): Boolean {
        val now = System.currentTimeMillis()
        
        // Clean up old cache entries
        val iterator = dedupeCache.entries.iterator()
        while (iterator.hasNext()) {
            if (now - iterator.next().value > CACHE_EXPIRY_MS) {
                iterator.remove()
            }
        }

        // Generate unique key for this transaction
        // We round amount to avoid floating point issues in key
        val key = "${tx.amount.toInt()}_${tx.merchant.lowercase()}_${tx.type}"
        
        if (dedupeCache.containsKey(key)) {
            return true
        }

        dedupeCache[key] = now
        return false
    }

    private fun showOverlay(transaction: ParsedTransaction) {
        if (android.provider.Settings.canDrawOverlays(this)) {
            val intent = Intent(this, OverlayService::class.java).apply {
                putExtra("amount", transaction.amount)
                putExtra("merchant", transaction.merchant)
                putExtra("appName", transaction.appName)
                putExtra("timestamp", transaction.timestamp)
                putExtra("rawText", transaction.rawText)
                putExtra("confidence", transaction.confidence)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startService(intent)
        } else {
            Log.w(TAG, "Cannot show overlay: Permission not granted")
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        // Not needed for now
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.i(TAG, "Notification Listener Connected")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.w(TAG, "Notification Listener Disconnected")
    }
}

