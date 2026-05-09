package com.pixel.reimburse

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.util.Log
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "FinancialNotification")
class FinancialNotificationPlugin : Plugin() {

    private val PREFS_NAME = "FinancialNotificationPrefs"
    private val PENDING_TX_KEY = "pending_transactions"

    companion object {
        private var instance: FinancialNotificationPlugin? = null

        fun onTransactionDetected(transaction: ParsedTransaction) {
            val data = JSObject().apply {
                put("amount", transaction.amount)
                put("merchant", transaction.merchant)
                put("type", transaction.type)
                put("appName", transaction.appName)
                put("timestamp", transaction.timestamp)
                put("rawText", transaction.rawText)
                put("reference", transaction.reference)
            }
            
            if (instance != null) {
                instance?.notifyListeners("transactionDetected", data)
            } else {
                // If app is not running, store it for later sync
                savePendingTransaction(data)
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
                savePendingAction(data)
            }
        }

        private fun savePendingTransaction(data: JSObject) {
            val context = instance?.context ?: return
            val prefs = context.getSharedPreferences("FinancialNotificationPrefs", Context.MODE_PRIVATE)
            val current = prefs.getStringSet("pending_transactions", mutableSetOf()) ?: mutableSetOf()
            current.add(data.toString())
            prefs.edit().putStringSet("pending_transactions", current).apply()
        }

        private fun savePendingAction(data: JSObject) {
            val context = instance?.context ?: return
            val prefs = context.getSharedPreferences("FinancialNotificationPrefs", Context.MODE_PRIVATE)
            val current = prefs.getStringSet("pending_actions", mutableSetOf()) ?: mutableSetOf()
            current.add(data.toString())
            prefs.edit().putStringSet("pending_actions", current).apply()
        }
    }

    override fun load() {
        instance = this
        Log.d("FinancialNotification", "Plugin loaded and instance set")
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
            OverlayService.updateCategories(list)
        }
        call.resolve()
    }

    private fun isNotificationServiceEnabled(): Boolean {
        val enabledListeners = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
        return enabledListeners != null && enabledListeners.contains(context.packageName)
    }
}
