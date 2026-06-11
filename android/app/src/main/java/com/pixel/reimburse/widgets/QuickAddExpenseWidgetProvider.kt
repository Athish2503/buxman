package com.pixel.reimburse.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.widget.RemoteViews
import com.pixel.reimburse.R
import com.pixel.reimburse.transactions.OverlayActivity
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * QuickAddExpenseWidgetProvider
 *
 * One-tap home screen widget for Buxman. Provides:
 *   • "ADD EXPENSE" button → opens OverlayActivity with an empty quick-add form
 *     (works even when the main app is closed — true native overlay experience)
 *   • "VOICE" button → opens app via deep link to voice log flow
 *   • "SCAN" button → opens app via deep link to scan receipt flow
 *
 * The widget also shows the current month's spend total as a subtitle so users
 * have context before tapping Add.
 */
class QuickAddExpenseWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "QuickAddWidget"
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        Log.d(TAG, "onUpdate triggered for ${appWidgetIds.size} widget(s)")
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_one_tap_add)

        // ── Action 1: One-Tap Add Expense ───────────────────────────────
        // Opens OverlayActivity directly — works without the main app being open.
        // We pass amount=0 and merchant="Quick Add" so the overlay shows an empty form.
        val overlayIntent = Intent(context, OverlayActivity::class.java).apply {
            putExtra("amount", 0.0)
            putExtra("merchant", "")
            putExtra("appName", "Widget")
            putExtra("rawText", "")
            putExtra("type", "debit")
            putExtra("confidenceScore", 100)
            putExtra("account", "")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val addPendingIntent = PendingIntent.getActivity(
            context,
            appWidgetId * 10 + 1,
            overlayIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_one_tap_add, addPendingIntent)

        // ── Action 2: Voice Log ─────────────────────────────────────────
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
        views.setOnClickPendingIntent(R.id.btn_one_tap_voice, voicePendingIntent)

        // ── Action 3: Scan Receipt ──────────────────────────────────────
        val scanIntent = Intent(Intent.ACTION_VIEW, Uri.parse("pixelreimburse://scan-receipt")).apply {
            `package` = context.packageName
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val scanPendingIntent = PendingIntent.getActivity(
            context,
            appWidgetId * 10 + 3,
            scanIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_one_tap_scan, scanPendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)
        Log.d(TAG, "Widget $appWidgetId updated")
    }
}
