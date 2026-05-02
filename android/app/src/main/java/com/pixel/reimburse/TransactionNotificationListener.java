package com.pixel.reimburse;

import android.app.Notification;
import android.content.Intent;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

public class TransactionNotificationListener extends NotificationListenerService {
    private static final String TAG = "TransactionMonitor";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        String packageName = sbn.getPackageName();
        Notification notification = sbn.getNotification();
        Bundle extras = notification.extras;

        if (extras == null) return;

        String title = extras.getString(Notification.EXTRA_TITLE, "");
        String text = extras.getCharSequence(Notification.EXTRA_TEXT, "").toString();
        String bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT, "").toString();

        String fullText = (title + " " + text + " " + bigText).toLowerCase();

        // Basic check for transaction-related keywords
        if (fullText.contains("rs.") || fullText.contains("inr") || 
            fullText.contains("debited") || fullText.contains("spent") || 
            fullText.contains("transaction") || fullText.contains("paid to") ||
            fullText.contains("vpa") || fullText.contains("upi") ||
            fullText.contains("merchant") || fullText.contains("credited") ||
            fullText.contains("purchased") || fullText.contains("spent on")) {
            
            Log.d(TAG, "Transaction-like notification detected from: " + packageName);
            
            // 1. Broadcast for when the app is already in the foreground
            Intent broadcastIntent = new Intent("com.pixel.reimburse.TRANSACTION_DETECTED");
            broadcastIntent.putExtra("body", title + ": " + text);
            broadcastIntent.putExtra("package", packageName);
            sendBroadcast(broadcastIntent);

            // 2. Start MainActivity to bring it to the foreground (Overlay)
            if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.Q || 
                android.provider.Settings.canDrawOverlays(this)) {
                
                Intent activityIntent = new Intent(this, MainActivity.class);
                activityIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                activityIntent.putExtra("body", title + ": " + text);
                startActivity(activityIntent);
            } else {
                Log.w(TAG, "Overlay permission not granted, sending notification fallback");
                NotificationHelper.showTransactionNotification(this, title + ": " + text);
            }


        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // Not needed for now
    }
}
