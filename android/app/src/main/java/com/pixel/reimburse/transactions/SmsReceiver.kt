package com.pixel.reimburse.transactions

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telephony.SmsMessage
import android.util.Log

class SmsReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "TRANSACTION_DEBUG"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "android.provider.Telephony.SMS_RECEIVED") return

        val bundle = intent.extras ?: return
        val pdus = bundle.get("pdus") as? Array<*> ?: return
        val format = bundle.getString("format")

        val messageChunks = mutableMapOf<String, StringBuilder>()

        for (pdu in pdus) {
            if (pdu !is ByteArray) continue
            val sms = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                SmsMessage.createFromPdu(pdu, format)
            } else {
                @Suppress("DEPRECATION")
                SmsMessage.createFromPdu(pdu)
            } ?: continue

            val sender = sms.displayOriginatingAddress ?: "UnknownSender"
            val body = sms.messageBody ?: ""

            messageChunks.getOrPut(sender) { StringBuilder() }.append(body)
        }

        for ((sender, bodyBuilder) in messageChunks) {
            val fullBody = bodyBuilder.toString()
            Log.d(TAG, "[SmsReceiver] Combined SMS from [$sender]: $fullBody")

            // Pass to TransactionDetector for deep parsing and confidence scoring
            TransactionDetector.processTransactionContent(
                context = context,
                text = fullBody,
                packageName = sender,
                title = "SMS",
                source = "SmsReceiver"
            )
        }
    }
}
