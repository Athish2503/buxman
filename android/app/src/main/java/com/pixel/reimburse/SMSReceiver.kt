package com.pixel.reimburse

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.telephony.SmsMessage
import android.util.Log

class SMSReceiver : BroadcastReceiver() {
    private val TAG = "SMSMonitor"
    private val parser = TransactionParserEngine()

    override fun onReceive(context: Context, intent: Intent) {
        if ("android.provider.Telephony.SMS_RECEIVED" == intent.action) {
            val bundle = intent.extras ?: return
            val pdus = bundle.get("pdus") as Array<*>? ?: return
            val format = bundle.getString("format")

            for (pdu in pdus) {
                val smsMessage = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    SmsMessage.createFromPdu(pdu as ByteArray, format)
                } else {
                    SmsMessage.createFromPdu(pdu as ByteArray)
                }

                val body = smsMessage.messageBody ?: continue
                val sender = smsMessage.displayOriginatingAddress ?: "Unknown"

                Log.d(TAG, "SMS received from $sender: $body")

                val transaction = parser.parse(sender, "SMS", body, System.currentTimeMillis())
                
                if (transaction != null) {
                    Log.i(TAG, "Transaction detected in SMS: ${transaction.amount} at ${transaction.merchant}")
                    
                    // 1. Notify Capacitor Plugin
                    FinancialNotificationPlugin.onTransactionDetected(transaction)
                    
                    // 2. Show Overlay if it's a debit transaction
                    if (transaction.type == "debit") {
                        showOverlay(context, transaction)
                    }
                }
            }
        }
    }

    private fun showOverlay(context: Context, transaction: ParsedTransaction) {
        if (Settings.canDrawOverlays(context)) {
            val intent = Intent(context, OverlayService::class.java).apply {
                putExtra("amount", transaction.amount)
                putExtra("merchant", transaction.merchant)
                putExtra("appName", transaction.appName)
                putExtra("timestamp", transaction.timestamp)
                putExtra("rawText", transaction.rawText)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startService(intent)
        }
    }
}
