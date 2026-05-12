package com.pixel.reimburse.transactions

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.util.Log

class OverlayActivity : Activity() {
    companion object {
        private const val TAG = "TRANSACTION_DEBUG"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d(TAG, "OverlayActivity created to dispatch transaction overlay dialog seamlessly.")

        val amount = intent.getDoubleExtra("amount", 0.0)
        val merchant = intent.getStringExtra("merchant") ?: "Unknown Merchant"
        val appName = intent.getStringExtra("appName") ?: "System"
        val rawText = intent.getStringExtra("rawText") ?: ""

        if (Settings.canDrawOverlays(this)) {
            val serviceIntent = Intent(this, TransactionOverlayService::class.java).apply {
                putExtra("amount", amount)
                putExtra("merchant", merchant)
                putExtra("appName", appName)
                putExtra("rawText", rawText)
            }
            startService(serviceIntent)
        } else {
            Log.w(TAG, "Overlay permission not granted. Cannot start TransactionOverlayService.")
        }

        finish()
    }
}
