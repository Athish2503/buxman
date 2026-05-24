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
import org.json.JSONArray
import org.json.JSONObject

@CapacitorPlugin(name = "FinancialNotification")
class FinancialNotificationPlugin : Plugin() {

    private val PREFS_NAME = "FinancialNotificationPrefs"

    companion object {
        private var instance: FinancialNotificationPlugin? = null

        fun onTransactionCaptured(context: Context, info: ParsedTransactionInfo) {
            val eventId = "TX_" + System.currentTimeMillis() + "_" + (1000..9999).random()
            val data = JSObject().apply {
                put("eventId", eventId)
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
                put("account", info.account ?: "")
                put("bankName", info.bankName ?: "")
                put("referenceNumber", info.referenceNumber ?: "")
                put("matchedKeywords", JSArray(info.matchedKeywords))
                put("rejectionReason", info.rejectionReason ?: "")
            }

            // Always save to persistent queue
            savePendingTransaction(context, data)
            
            // Track for diagnostics
            addToDiagnostics(context, data)

            if (instance != null) {
                Log.d("FinancialNotification", "Notifying JS listeners: transactionDetected")
                instance?.notifyListeners("transactionDetected", data)
            }
        }

        private fun addToDiagnostics(context: Context, data: JSObject) {
            val prefs = context.getSharedPreferences("FinancialDiagnostics", Context.MODE_PRIVATE)
            val history = prefs.getString("history", "[]") ?: "[]"
            try {
                val array = JSONArray(history)
                val newObj = JSONObject(data.toString())
                
                // Keep only last 20
                val newArray = JSONArray()
                newArray.put(newObj)
                for (i in 0 until Math.min(array.length(), 19)) {
                    newArray.put(array.get(i))
                }
                prefs.edit().putString("history", newArray.toString()).apply()
            } catch (e: Exception) {
                Log.e("FinancialNotification", "Error updating diagnostics", e)
            }
        }

        fun logTransactionAttempt(context: Context, info: ParsedTransactionInfo) {
            val data = JSObject().apply {
                put("type", "ATTEMPT")
                put("amount", info.amount)
                put("merchant", info.merchant)
                put("source", info.extractionSource)
                put("confidence", info.confidenceScore)
                put("txnType", info.type)
                put("rawText", info.rawText)
                put("normalizedText", info.normalizedText)
                put("matchedKeywords", JSArray(info.matchedKeywords))
                put("negativeKeywords", JSArray(info.negativeKeywords))
                put("isPromotional", info.isPromotional)
                put("rejectionReason", info.rejectionReason ?: "")
                put("timestamp", info.timestamp)
                
                val breakdown = JSObject()
                info.scoreBreakdown.forEach { (k, v) -> breakdown.put(k, v) }
                put("scoreBreakdown", breakdown)
            }
            addToDiagnostics(context, data)
        }

        fun logRejection(context: Context, text: String, source: String, reason: String, keywords: List<String> = emptyList()) {
            val data = JSObject().apply {
                put("type", "REJECTION")
                put("rawText", text)
                put("source", source)
                put("reason", reason)
                put("confidence", 0)
                put("matchedKeywords", JSArray(keywords))
                put("timestamp", System.currentTimeMillis())
            }
            addToDiagnostics(context, data)
        }

        fun onOverlayAction(context: Context, action: String, amount: Double, merchant: String, category: String? = null, notes: String? = null, persistedNatively: Boolean = false, isReimbursement: Boolean = false) {
            val eventId = "ACT_" + System.currentTimeMillis() + "_" + (1000..9999).random()
            val data = JSObject().apply {
                put("eventId", eventId)
                put("action", action)
                put("amount", amount)
                put("merchant", merchant)
                put("category", category)
                put("notes", notes)
                put("persistedNatively", persistedNatively)
                put("isReimbursement", isReimbursement)
            }
            
            // Always save to persistent queue
            savePendingAction(context, data)

            if (instance != null) {
                instance?.notifyListeners("overlayAction", data)
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
    fun checkFinancialPermissions(call: PluginCall) {
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
                putExtra("type", info.type)
                putExtra("account", info.account ?: "")
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
                putExtra("type", info.type)
                putExtra("account", info.account ?: "")
            }
            context.startService(intent)
        } catch (e: Exception) {}

        call.resolve()
    }

    @PluginMethod
    fun getDiagnostics(call: PluginCall) {
        val prefs = context.getSharedPreferences("FinancialDiagnostics", Context.MODE_PRIVATE)
        val history = prefs.getString("history", "[]") ?: "[]"
        val result = JSObject()
        try {
            result.put("history", JSArray(history))
        } catch (e: Exception) {
            result.put("history", JSArray())
        }
        call.resolve(result)
    }

    @PluginMethod
    fun clearDiagnostics(call: PluginCall) {
        val prefs = context.getSharedPreferences("FinancialDiagnostics", Context.MODE_PRIVATE)
        prefs.edit().remove("history").apply()
        call.resolve()
    }

    @PluginMethod
    fun forceOverlay(call: PluginCall) {
        val amount = call.getDouble("amount") ?: 999.0
        val merchant = call.getString("merchant") ?: "Forced Overlay Test"
        val appName = call.getString("appName") ?: "Debug"
        val type = call.getString("type") ?: "debit"

        try {
            val intent = Intent(context, TransactionOverlayService::class.java).apply {
                putExtra("amount", amount)
                putExtra("merchant", merchant)
                putExtra("appName", appName)
                putExtra("rawText", "Forced manually from developer options")
                putExtra("type", type)
            }
            context.startService(intent)
        } catch (e: Exception) {}

        call.resolve()
    }

    @PluginMethod
    fun acknowledgeEvent(call: PluginCall) {
        val id = call.getString("id")
        if (id != null) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            
            val actions = prefs.getStringSet("pending_actions", mutableSetOf()) ?: mutableSetOf()
            val updatedActions = actions.filterNot { it.contains(id) }.toMutableSet()
            prefs.edit().putStringSet("pending_actions", updatedActions).apply()

            val txs = prefs.getStringSet("pending_transactions", mutableSetOf()) ?: mutableSetOf()
            val updatedTxs = txs.filterNot { it.contains(id) }.toMutableSet()
            prefs.edit().putStringSet("pending_transactions", updatedTxs).apply()
        }
        call.resolve()
    }

    @PluginMethod
    fun updateWidgets(call: PluginCall) {
        try {
            val appWidgetManager = android.appwidget.AppWidgetManager.getInstance(context)
            
            // Trigger Budget Widget update
            val budgetWidgetIntent = Intent(context, com.pixel.reimburse.widgets.BudgetWidgetProvider::class.java).apply {
                action = android.appwidget.AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            val budgetWidgetIds = appWidgetManager.getAppWidgetIds(
                android.content.ComponentName(context, com.pixel.reimburse.widgets.BudgetWidgetProvider::class.java)
            )
            budgetWidgetIntent.putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_IDS, budgetWidgetIds)
            context.sendBroadcast(budgetWidgetIntent)

            // Trigger Quick Actions Widget update
            val actionsWidgetIntent = Intent(context, com.pixel.reimburse.widgets.QuickActionsWidgetProvider::class.java).apply {
                action = android.appwidget.AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            val actionsWidgetIds = appWidgetManager.getAppWidgetIds(
                android.content.ComponentName(context, com.pixel.reimburse.widgets.QuickActionsWidgetProvider::class.java)
            )
            actionsWidgetIntent.putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_IDS, actionsWidgetIds)
            context.sendBroadcast(actionsWidgetIntent)

            Log.d("FinancialNotification", "Successfully sent update broadcast to widgets.")
            call.resolve()
        } catch (e: Exception) {
            Log.e("FinancialNotification", "Error forcing widget update", e)
            call.reject("Failed to update widgets", e)
        }
    }

    private fun isNotificationServiceEnabled(): Boolean {
        val enabledListeners = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
        return enabledListeners != null && enabledListeners.contains(context.packageName)
    }
}
