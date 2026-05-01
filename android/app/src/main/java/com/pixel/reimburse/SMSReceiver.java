package com.pixel.reimburse;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

public class SMSReceiver extends BroadcastReceiver {
    private static final String TAG = "SMSMonitor";

    @Override
    public void onReceive(Context context, Intent intent) {
        if ("android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            Bundle bundle = intent.getExtras();
            if (bundle != null) {
                Object[] pdus = (Object[]) bundle.get("pdus");
                if (pdus != null) {
                    for (Object pdu : pdus) {
                        String format = bundle.getString("format");
                        SmsMessage smsMessage;
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                            smsMessage = SmsMessage.createFromPdu((byte[]) pdu, format);
                        } else {
                            smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                        }
                        
                        String body = smsMessage.getMessageBody();
                        String sender = smsMessage.getDisplayOriginatingAddress();

                        Log.d(TAG, "SMS received from: " + sender + " Body: " + body);

                        // Simple filter for transaction messages
                        String lowerBody = body.toLowerCase();
                        if (lowerBody.contains("rs.") || lowerBody.contains("inr") || 
                            lowerBody.contains("debited") || lowerBody.contains("spent") || 
                            lowerBody.contains("transaction") || lowerBody.contains("vpa") ||
                            lowerBody.contains("paid to") || lowerBody.contains("credited")) {
                            
                            Log.d(TAG, "Transaction SMS detected!");

                            // 1. Broadcast for when the app is already in the foreground
                            Intent broadcastIntent = new Intent("com.pixel.reimburse.TRANSACTION_DETECTED");
                            broadcastIntent.putExtra("body", body);
                            broadcastIntent.putExtra("sender", sender);
                            context.sendBroadcast(broadcastIntent);

                            // 2. Start MainActivity to bring it to the foreground (Nudge)
                            // We use a small delay or check to ensure we don't spam if multiple PDUs
                            Intent activityIntent = new Intent(context, MainActivity.class);
                            activityIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                            activityIntent.putExtra("body", body);
                            context.startActivity(activityIntent);
                        }
                    }
                }
            }
        }
    }
}
