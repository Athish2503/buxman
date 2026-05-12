package com.pixel.reimburse

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import com.pixel.reimburse.transactions.ParsedTransactionInfo
import com.pixel.reimburse.transactions.TransactionOverlayService

@CapacitorPlugin(name = "FinancialNotification")
class FinancialNotificationPlugin : Plugin() {

    private val PREFS_NAME = "FinancialNotificationPrefs"

    companion object {
        private var instance: FinancialNotificationPlugin? = null

        fun onTransactionCaptured(context: Context, info: ParsedTransactionInfo) {
            val data = JSObject().apply {
                put("amount", info.amount)
                put("merchant", info.merchant)
                put("source", info.sourceApp)
                put("appName", info.sourceApp)
                put("confidence", info.confidenceScore)
                put("type", info.type)
                put("rawText", info.rawText)
                put("timestamp", info.timestamp)
                put("reference", info.transactionId)
                put("transactionId", info.transactionId)
            }

            if (instance != null) {
                Log.d("FinancialNotification", "Notifying JS listeners: transactionDetected")
                instance?.notifyListeners("transactionDetected", data)
            } else {
                Log.d("FinancialNotification", "Plugin instance null, queueing pending transaction persistently")
                savePendingTransaction(context, data)
            }
        }

        fun onOverlayAction(action: String, amount: Double, merchant: String, category: String? = null, notes: String? = null) {
            val data = JSObject().apply {
                put("action", action)
                put("amount", amount)
                put("merchant", merchant)
                put("category", category)
                put("notes", notes)
            }
            if (instance != null) {
                instance?.notifyListeners("overlayAction", data)
            } else {
                val ctx = instance?.context
                if (ctx != null) {
                    savePendingAction(ctx, data)
                }
            }
        }

        private fun savePendingTransaction(context: Context, data: JSObject) {
            val prefs = context.getSharedPreferences("FinancialNotificationPrefs", Context.MODE_PRIVATE)
            val current = prefs.getStringSet("pending_transactions", mutableSetOf()) ?: mutableSetOf()
            val updated = mutableSetOf<String>().apply {
                addAll(current)
                add(data.toString())
            }
            prefs.edit().putStringSet("pending_transactions", updated).apply()
            Log.d("FinancialNotification", "Saved pending transaction to persistent queue.")
        }

        private fun savePendingAction(context: Context, data: JSObject) {
            val prefs = context.getSharedPreferences("FinancialNotificationPrefs", Context.MODE_PRIVATE)
            val current = prefs.getStringSet("pending_actions", mutableSetOf()) ?: mutableSetOf()
            val updated = mutableSetOf<String>().apply {
                addAll(current)
                add(data.toString())
            }
            prefs.edit().putStringSet("pending_actions", updated).apply()
        }
    }

    override fun load() {
        instance = this
        Log.d("FinancialNotification", "FinancialNotificationPlugin initialized successfully.")
    }

    @PluginMethod
    override fun checkPermissions(call: PluginCall) {
        val result = JSObject().apply {
            put("notifications", isNotificationServiceEnabled())
            put("overlay", Settings.canDrawOverlays(context))
        }
        call.resolve(result)
    }

    @PluginMethod
    fun flushPendingQueue(call: PluginCall) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        val transactions = prefs.getStringSet("pending_transactions", null)
        if (transactions != null) {
            for (txStr in transactions) {
                try {
                    notifyListeners("transactionDetected", JSObject(txStr))
                } catch (e: Exception) {
                    Log.e("FinancialNotification", "Failed to parse stored transaction", e)
                }
            }
            prefs.edit().remove("pending_transactions").apply()
        }

        val actions = prefs.getStringSet("pending_actions", null)
        if (actions != null) {
            for (actionStr in actions) {
                try {
                    notifyListeners("overlayAction", JSObject(actionStr))
                } catch (e: Exception) {
                    Log.e("FinancialNotification", "Failed to parse stored action", e)
                }
            }
            prefs.edit().remove("pending_actions").apply()
        }

        call.resolve()
    }

    @PluginMethod
    fun openNotificationSettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        call.resolve()
    }

    @PluginMethod
    fun openOverlaySettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${context.packageName}"))
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        call.resolve()
    }

    @PluginMethod
    fun updateCategories(call: PluginCall) {
        val cats = call.getArray("categories")
        if (cats != null) {
            val list = mutableListOf<String>()
            for (i in 0 until cats.length()) {
                list.add(cats.getString(i))
            }
            TransactionOverlayService.updateCategories(list)
        }
        call.resolve()
    }

    @PluginMethod
    fun requestIgnoreBatteryOptimizations(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                Uri.parse("package:${context.packageName}"))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        }
        call.resolve()
    }

    @PluginMethod
    fun isIgnoringBatteryOptimizations(call: PluginCall) {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
        val result = JSObject().apply {
            put("isIgnoring", if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                powerManager.isIgnoringBatteryOptimizations(context.packageName)
            } else {
                true
            })
        }
        call.resolve(result)
    }

    @PluginMethod
    fun simulateTransaction(call: PluginCall) {
        val amount = call.getDouble("amount") ?: 1250.0
        val merchant = call.getString("merchant") ?: "STARBUCKS"
        val appName = call.getString("appName") ?: "GPay"

        Log.d("FinancialNotification", "Simulating transaction: $merchant, $amount")

        val info = ParsedTransactionInfo(
            amount = amount,
            merchant = merchant,
            sourceApp = appName,
            confidenceScore = 100,
            type = "debit",
            transactionId = "SIM${System.currentTimeMillis()}",
            rawText = "Simulated transaction for testing",
            timestamp = System.currentTimeMillis()
        )

        onTransactionCaptured(context, info)

        try {
            val intent = Intent(context, TransactionOverlayService::class.java).apply {
                putExtra("amount", info.amount)
                putExtra("merchant", info.merchant)
                putExtra("appName", info.sourceApp)
                putExtra("rawText", info.rawText)
            }
            context.startService(intent)
        } catch (e: Exception) {
            Log.e("FinancialNotification", "Failed starting TransactionOverlayService", e)
        }

        call.resolve()
    }

    @PluginMethod
    fun simulateNotification(call: PluginCall) {
        val title = call.getString("title") ?: "GPay"
        val text = call.getString("text") ?: "Paid ₹850 to Zomato"
        val packageName = call.getString("packageName") ?: "com.google.android.apps.nbu.paisa.user"

        com.pixel.reimburse.transactions.TransactionDetector.processTransactionContent(
            context = context,
            text = "$title $text",
            packageName = packageName,
            title = title,
            source = "SimulatedNotification"
        )
        call.resolve()
    }

    @PluginMethod
    fun simulateSms(call: PluginCall) {
        val sender = call.getString("sender") ?: "VM-HDFCBK"
        val body = call.getString("body") ?: "Your A/c XXXX is debited with INR 450.00 towards Zomato on 12-05-26. Ref: 987654321"

        com.pixel.reimburse.transactions.TransactionDetector.processTransactionContent(
            context = context,
            text = body,
            packageName = sender,
            title = "SMS",
            source = "SimulatedSms"
        )
        call.resolve()
    }

    @PluginMethod
    fun simulateGPayTransaction(call: PluginCall) {
        val amount = call.getDouble("amount") ?: 1500.0
        val merchant = call.getString("merchant") ?: "Swiggy Instamart"

        val info = ParsedTransactionInfo(
            amount = amount,
            merchant = merchant,
            sourceApp = "GPay",
            confidenceScore = 100,
            type = "debit",
            transactionId = "SIM${System.currentTimeMillis()}",
            rawText = "Paid ₹$amount to $merchant",
            timestamp = System.currentTimeMillis()
        )
        onTransactionCaptured(context, info)

        try {
            val intent = Intent(context, TransactionOverlayService::class.java).apply {
                putExtra("amount", info.amount)
                putExtra("merchant", info.merchant)
                putExtra("appName", info.sourceApp)
                putExtra("rawText", info.rawText)
            }
            context.startService(intent)
        } catch (e: Exception) {}

        call.resolve()
    }

    @PluginMethod
    fun forceOverlay(call: PluginCall) {
        val amount = call.getDouble("amount") ?: 999.0
        val merchant = call.getString("merchant") ?: "Forced Overlay Test"
        val appName = call.getString("appName") ?: "Debug"

        try {
            val intent = Intent(context, TransactionOverlayService::class.java).apply {
                putExtra("amount", amount)
                putExtra("merchant", merchant)
                putExtra("appName", appName)
                putExtra("rawText", "Forced manually from developer options")
            }
            context.startService(intent)
        } catch (e: Exception) {}

        call.resolve()
    }

    private fun isNotificationServiceEnabled(): Boolean {
        val enabledListeners = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
        return enabledListeners != null && enabledListeners.contains(context.packageName)
    }
}
