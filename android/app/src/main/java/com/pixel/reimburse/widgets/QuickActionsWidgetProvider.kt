package com.pixel.reimburse.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.pixel.reimburse.R

class QuickActionsWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_quick_actions)

        // Action 1: Add Expense
        val addIntent = Intent(Intent.ACTION_VIEW, Uri.parse("pixelreimburse://add-expense")).apply {
            `package` = context.packageName
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val addPendingIntent = PendingIntent.getActivity(
            context,
            appWidgetId * 10 + 3,
            addIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_action_add, addPendingIntent)

        // Action 2: Voice Log
        val voiceIntent = Intent(Intent.ACTION_VIEW, Uri.parse("pixelreimburse://voice-log")).apply {
            `package` = context.packageName
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val voicePendingIntent = PendingIntent.getActivity(
            context,
            appWidgetId * 10 + 4,
            voiceIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_action_voice, voicePendingIntent)

        // Action 3: Scan Receipt
        val scanIntent = Intent(Intent.ACTION_VIEW, Uri.parse("pixelreimburse://scan-receipt")).apply {
            `package` = context.packageName
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val scanPendingIntent = PendingIntent.getActivity(
            context,
            appWidgetId * 10 + 5,
            scanIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_action_scan, scanPendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
