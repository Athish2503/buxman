package com.pixel.reimburse;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

public class SMSReceiver extends BroadcastReceiver {
    private static final String TAG = "SMSMonitor";
    private static final java.util.regex.Pattern TRANSACTION_PATTERN = java.util.regex.Pattern.compile(
        "rs\\.|inr|debited|spent|transaction|vpa|paid to|credited|upi|merchant|purchased|spent on",
        java.util.regex.Pattern.CASE_INSENSITIVE
    );

    @Override
    public void onReceive(Context context, Intent intent) {
        if ("android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            Bundle bundle = intent.getExtras();
            if (bundle == null) return;

            Object[] pdus = (Object[]) bundle.get("pdus");
            if (pdus == null) return;

            String format = bundle.getString("format");
            for (Object pdu : pdus) {
                SmsMessage smsMessage;
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                    smsMessage = SmsMessage.createFromPdu((byte[]) pdu, format);
                } else {
                    smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                }
                
                String body = smsMessage.getMessageBody();
                String sender = smsMessage.getDisplayOriginatingAddress();

                if (body == null) continue;

                // Simple filter for transaction messages using Regex
                if (TRANSACTION_PATTERN.matcher(body).find()) {
                    Log.d(TAG, "Transaction SMS detected!");

                    // 1. Broadcast for when the app is already in the foreground
                    Intent broadcastIntent = new Intent("com.pixel.reimburse.TRANSACTION_DETECTED");
                    broadcastIntent.putExtra("body", body);
                    broadcastIntent.putExtra("sender", sender);
                    context.sendBroadcast(broadcastIntent);

                    // 2. Start MainActivity to bring it to the foreground (Nudge)
                    if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.Q || 
                        android.provider.Settings.canDrawOverlays(context)) {
                        
                        Intent activityIntent = new Intent(context, MainActivity.class);
                        activityIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                        activityIntent.putExtra("body", body);
                        context.startActivity(activityIntent);
                    } else {
                        NotificationHelper.showTransactionNotification(context, body);
                    }
                }
            }
        }
    }
}
