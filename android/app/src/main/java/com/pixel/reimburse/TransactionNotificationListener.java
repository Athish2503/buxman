package com.pixel.reimburse;

import android.app.Notification;
import android.content.Intent;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

public class TransactionNotificationListener extends NotificationListenerService {
    private static final String TAG = "TransactionMonitor";
    private static final java.util.regex.Pattern TRANSACTION_PATTERN = java.util.regex.Pattern.compile(
        "rs\\.|inr|debited|spent|transaction|paid to|vpa|upi|merchant|credited|purchased|spent on",
        java.util.regex.Pattern.CASE_INSENSITIVE
    );

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        String packageName = sbn.getPackageName();
        
        // 1. Filter out irrelevant packages immediately
        if (packageName.equals(getPackageName()) || 
            packageName.contains("android.systemui") || 
            packageName.contains("android.providers")) {
            return;
        }

        Notification notification = sbn.getNotification();
        Bundle extras = notification.extras;
        if (extras == null) return;

        CharSequence titleCS = extras.getCharSequence(Notification.EXTRA_TITLE, "");
        CharSequence textCS = extras.getCharSequence(Notification.EXTRA_TEXT, "");
        
        String title = titleCS.toString();
        String text = textCS.toString();
        
        // Combine text for matching
        String combined = title + " " + text;

        // 2. Efficient Regex Match
        if (TRANSACTION_PATTERN.matcher(combined).find()) {
            Log.d(TAG, "Transaction-like notification detected from: " + packageName);
            
            // 3. Broadcast for when the app is already in the foreground
            Intent broadcastIntent = new Intent("com.pixel.reimburse.TRANSACTION_DETECTED");
            broadcastIntent.putExtra("body", title + ": " + text);
            broadcastIntent.putExtra("package", packageName);
            sendBroadcast(broadcastIntent);

            // 4. Start MainActivity to bring it to the foreground (Overlay)
            // Only if permission is granted, otherwise fallback to notification
            if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.Q || 
                android.provider.Settings.canDrawOverlays(this)) {
                
                Intent activityIntent = new Intent(this, MainActivity.class);
                activityIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                activityIntent.putExtra("body", title + ": " + text);
                startActivity(activityIntent);
            } else {
                NotificationHelper.showTransactionNotification(this, title + ": " + text);
            }
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {}
}
