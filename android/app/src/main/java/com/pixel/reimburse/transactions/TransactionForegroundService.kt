package com.pixel.reimburse.transactions

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.pixel.reimburse.R

class TransactionForegroundService : Service() {
    companion object {
        private const val TAG = "TRANSACTION_DEBUG"
        private const val CHANNEL_ID = "persistent_capture_service"
        private const val NOTIFICATION_ID = 8899
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "TransactionForegroundService Created. Initializing persistent capture status.")
        createNotificationChannel()
        startPersistentForeground()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "TransactionForegroundService onStartCommand executed.")
        // Ensure service stays alive and restarts automatically if terminated by aggressive OEM task killers
        return START_STICKY
    }

    private fun startPersistentForeground() {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Buxman Capture Engine")
            .setContentText("Expense detection active")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setOngoing(true)
            .build()

        try {
            startForeground(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start foreground persistent notification", e)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Persistent Expense Detection",
                NotificationManager.IMPORTANCE_MIN
            ).apply {
                description = "Keeps transaction detection active reliably in the background."
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.w(TAG, "TransactionForegroundService Destroyed. Attempting automatic revival via broadcast if necessary.")
    }
}
