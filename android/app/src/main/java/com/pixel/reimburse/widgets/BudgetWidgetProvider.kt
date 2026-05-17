package com.pixel.reimburse.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.widget.RemoteViews
import com.pixel.reimburse.MainActivity
import com.pixel.reimburse.R
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class BudgetWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        Log.d("BudgetWidget", "onUpdate triggered for widgets: ${appWidgetIds.size}")
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_budget)

        // Read from SharedPreferences of Capacitor Preferences
        val sharedPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
        val expensesJson = sharedPrefs.getString("reimburse_expenses_v2", null)
        val settingsJson = sharedPrefs.getString("reimburse_settings_v2", null)

        var totalMonthSpend = 0.0
        var totalMonthBudget = 0.0
        var currencySymbol = "₹" // Default to INR
        var hasBudgetLimit = false

        if (settingsJson != null) {
            try {
                val settingsObj = JSONObject(settingsJson)
                val currency = settingsObj.optString("currency", "INR")
                currencySymbol = when (currency) {
                    "USD" -> "$"
                    "EUR" -> "€"
                    "GBP" -> "£"
                    else -> "₹"
                }

                val budgetsArr = settingsObj.optJSONArray("budgets")
                if (budgetsArr != null && budgetsArr.length() > 0) {
                    for (i in 0 until budgetsArr.length()) {
                        val budgetObj = budgetsArr.getJSONObject(i)
                        totalMonthBudget += budgetObj.optDouble("limit", 0.0)
                    }
                    hasBudgetLimit = totalMonthBudget > 0
                }
            } catch (e: Exception) {
                Log.e("BudgetWidget", "Error parsing settings", e)
            }
        }

        if (expensesJson != null) {
            try {
                val expensesArr = JSONArray(expensesJson)
                val currentMonthPrefix = SimpleDateFormat("yyyy-MM", Locale.getDefault()).format(Date()) // e.g. "2026-05"

                for (i in 0 until expensesArr.length()) {
                    val expenseObj = expensesArr.getJSONObject(i)
                    val dateStr = expenseObj.optString("date", "") // e.g. "2026-05-17"
                    if (dateStr.startsWith(currentMonthPrefix)) {
                        val status = expenseObj.optString("status", "approved")
                        if (status != "rejected") {
                            totalMonthSpend += expenseObj.optDouble("amount", 0.0)
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e("BudgetWidget", "Error parsing expenses", e)
            }
        }

        // Bind spend text
        val formattedSpend = String.format(Locale.getDefault(), "%s%,.2f", currencySymbol, totalMonthSpend)
        views.setTextViewText(R.id.widget_total_spent, formattedSpend)

        if (hasBudgetLimit) {
            val progressPercent = Math.min(((totalMonthSpend / totalMonthBudget) * 100).toInt(), 100)
            views.setProgressBar(R.id.widget_budget_progress, 100, progressPercent, false)
            views.setTextViewText(R.id.widget_budget_status, String.format(Locale.getDefault(), "%s%,.0f Limit", currencySymbol, totalMonthBudget))

            val remaining = totalMonthBudget - totalMonthSpend
            if (remaining >= 0) {
                views.setTextViewText(R.id.widget_budget_remaining, String.format(Locale.getDefault(), "%s%,.2f left this month", currencySymbol, remaining))
                // Cyan for positive budget
                views.setTextColor(R.id.widget_budget_status, android.graphics.Color.parseColor("#06B6D4"))
            } else {
                views.setTextViewText(R.id.widget_budget_remaining, String.format(Locale.getDefault(), "Over budget by %s%,.2f!", currencySymbol, Math.abs(remaining)))
                // Rose red if over budget
                views.setTextColor(R.id.widget_budget_status, android.graphics.Color.parseColor("#F43F5E"))
            }
        } else {
            views.setProgressBar(R.id.widget_budget_progress, 100, 0, false)
            views.setTextViewText(R.id.widget_budget_status, "No Limit Set")
            views.setTextViewText(R.id.widget_budget_remaining, "Tap '+' to setup budget goals")
            views.setTextColor(R.id.widget_budget_status, android.graphics.Color.parseColor("#A1A1AA"))
        }

        // Bind click intents (Deep Links)
        // Action 1: Add Expense
        val addIntent = Intent(Intent.ACTION_VIEW, Uri.parse("pixelreimburse://add-expense")).apply {
            `package` = context.packageName
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val addPendingIntent = PendingIntent.getActivity(
            context,
            appWidgetId * 10 + 1,
            addIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_widget_add, addPendingIntent)

        // Action 2: Voice Log
        val voiceIntent = Intent(Intent.ACTION_VIEW, Uri.parse("pixelreimburse://voice-log")).apply {
            `package` = context.packageName
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val voicePendingIntent = PendingIntent.getActivity(
            context,
            appWidgetId * 10 + 2,
            voiceIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_widget_voice, voicePendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
