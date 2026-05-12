package com.pixel.reimburse.transactions

import android.util.Log
import java.util.Locale
import java.util.regex.Pattern

object TransactionParser {
    private const val TAG = "TRANSACTION_DEBUG"

    // Reject patterns: promotional messages, OTPs, credits, cashbacks, rewards
    private val rejectPatterns = listOf(
        Pattern.compile("otp|verification|code|password|login|attempt|request", Pattern.CASE_INSENSITIVE),
        Pattern.compile("credited|cashback|reward|received|refund|offered|promotion|claim|congratulations|loan|eligible|apply", Pattern.CASE_INSENSITIVE)
    )

    // Keywords indicating a valid deduction
    private val debitKeywords = listOf("paid", "debited", "sent", "spent", "payment successful", "transfer to", "paid to")

    // High confidence UPI/Bank deduction patterns
    private val upiPatterns = listOf(
        // Paid/Sent ₹100 to Merchant
        Pattern.compile("(?:Paid|Sent|Transfer to)\\s*(?:₹|Rs\\.?|INR)\\s*([\\d,]+\\.?\\d*)\\s*(?:to|at|for)\\s*(.+?)(?:\\s+ref|\\s+txn|\\s+on|\\s*$)", Pattern.CASE_INSENSITIVE),
        // Transaction successful of ₹100 at Merchant
        Pattern.compile("Transaction\\s*(?:of|for)?\\s*(?:₹|Rs\\.?|INR)\\s*([\\d,]+\\.?\\d*)\\s*(?:at|to)\\s*(.+?)\\s*successful", Pattern.CASE_INSENSITIVE),
        // Paid ₹100
        Pattern.compile("Paid\\s*(?:₹|Rs\\.?|INR)\\s*([\\d,]+\\.?\\d*)\\s*(?:to|at)\\s*(.+)", Pattern.CASE_INSENSITIVE),
        // ₹100 spent/debited at Merchant
        Pattern.compile("(?:₹|Rs\\.?|INR)\\s*([\\d,]+\\.?\\d*).*?(?:spent|debited|paid).*?(?:at|to)\\s*(.+?)(?:\\s+on|\\s+ref|\\s*$)", Pattern.CASE_INSENSITIVE)
    )

    private val bankPatterns = listOf(
        Pattern.compile("debited\\s+for\\s+payee\\s*(.*?)\\s*for\\s+(?:Rs\\.?|INR|₹)\\s*([\\d,]+\\.?\\d*)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?:INR|Rs\\.?|₹)\\s*([\\d,]+\\.?\\d*)\\s*debited\\s+from.*?For:\\s*(.+)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?:A/c|Acc|Account).*?(?:debited|spent).*?(?:₹|Rs\\.?|INR)\\s*([\\d,]+\\.?\\d*).*?(?:at|to|towards)\\s*(.+?)(?:\\s+on|\\s+ref|\\s*$)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("debited.*?from.*?(?:₹|Rs\\.?|INR)\\s*([\\d,]+\\.?\\d*).*?(?:at|to)\\s*(.+?)(?:\\s+on|\\s+ref|\\s*$)", Pattern.CASE_INSENSITIVE)
    )

    private val amountFallbackPattern = Pattern.compile("(?:₹|Rs\\.?|INR)\\s*([\\d,]+\\.?\\d*)", Pattern.CASE_INSENSITIVE)
    private val txnIdPattern = Pattern.compile("(?:ref|txn|reference|id|upi txn id)[:\\s]+([A-Z0-9]{8,15})", Pattern.CASE_INSENSITIVE)
    private val accountPattern = Pattern.compile("(?:A/c|Acc|Account)\\s*[\"':\\s]*([*X0-9]{4,18})", Pattern.CASE_INSENSITIVE)

    private fun safeLog(msg: String) {
        try {
            Log.d(TAG, msg)
        } catch (e: Exception) {
            // Suppress unmocked Log.d RuntimeException during pure JVM unit test execution
        }
    }

    fun parseTransaction(text: String, packageName: String? = null, title: String? = null): ParsedTransactionInfo? {
        val fullText = "${title ?: ""} $text".trim()
        safeLog("Parser input: [$fullText]")

        // 1. Check Reject Keywords
        if (rejectPatterns.any { it.matcher(fullText).find() }) {
            safeLog("Parser Score: 0 - Rejected due to promotional/OTP/credit keywords.")
            return null
        }

        // 2. Verify money deduction indicators
        val hasDebitKeyword = debitKeywords.any { fullText.lowercase().contains(it) }
        val hasCurrencySymbol = fullText.contains("₹") || fullText.lowercase().contains("rs") || fullText.lowercase().contains("inr")

        if (!hasDebitKeyword && !hasCurrencySymbol) {
            safeLog("Parser Score: 0 - Missing debit keywords or currency symbols.")
            return null
        }

        var amount = 0.0
        var merchant = ""
        var confidenceScore = 0

        // Try UPI Patterns
        for (pattern in upiPatterns) {
            val matcher = pattern.matcher(fullText)
            if (matcher.find()) {
                amount = parseAmount(matcher.group(1))
                merchant = cleanMerchant(matcher.group(2))
                confidenceScore = 95
                break
            }
        }

        // Try Bank Patterns if UPI patterns didn't match
        if (amount <= 0.0) {
            for (pattern in bankPatterns) {
                val matcher = pattern.matcher(fullText)
                if (matcher.find()) {
                    val amt1 = parseAmount(matcher.group(1))
                    if (amt1 > 0.0) {
                        amount = amt1
                        merchant = cleanMerchant(matcher.group(2))
                    } else {
                        amount = parseAmount(matcher.group(2))
                        merchant = cleanMerchant(matcher.group(1))
                    }
                    confidenceScore = 90
                    break
                }
            }
        }

        // Try Fallback Extraction
        if (amount <= 0.0) {
            val matcher = amountFallbackPattern.matcher(fullText)
            if (matcher.find()) {
                amount = parseAmount(matcher.group(1))
                if (amount > 0.0) {
                    merchant = extractMerchantFallback(fullText)
                    confidenceScore = if (hasDebitKeyword) 75 else 50
                }
            }
        }

        if (amount <= 0.0) {
            safeLog("Parser Score: 0 - Failed to resolve a non-zero deduction amount.")
            return null
        }

        if (merchant.isEmpty() || merchant.lowercase().contains("unknown")) {
            merchant = title?.takeIf { it.isNotBlank() && !it.lowercase().contains("transaction") } ?: "Unknown Merchant"
        }

        // Resolve Transaction ID
        var transactionId = "TXN${System.currentTimeMillis()}"
        val idMatcher = txnIdPattern.matcher(fullText)
        if (idMatcher.find()) {
            transactionId = idMatcher.group(1) ?: transactionId
        }

        var accountStr: String? = null
        val accMatcher = accountPattern.matcher(fullText)
        if (accMatcher.find()) {
            accountStr = accMatcher.group(1)
        }

        val sourceApp = resolveSourceApp(packageName ?: "", title ?: "")

        val info = ParsedTransactionInfo(
            amount = amount,
            merchant = merchant,
            sourceApp = sourceApp,
            confidenceScore = confidenceScore,
            type = "debit",
            transactionId = transactionId,
            rawText = fullText,
            timestamp = System.currentTimeMillis(),
            account = accountStr
        )

        safeLog("Parser Score: $confidenceScore - Successfully parsed: $info")
        return info
    }

    private fun parseAmount(amountStr: String?): Double {
        return try {
            amountStr?.replace(",", "")?.trim()?.toDoubleOrNull() ?: 0.0
        } catch (e: Exception) {
            0.0
        }
    }

    private fun cleanMerchant(raw: String?): String {
        if (raw == null) return "Unknown Merchant"
        var clean = raw.trim()
        val stopWords = listOf("successful", "on", "via", "using", "ref", "txn", "from", "at", "to", "-")
        for (word in stopWords) {
            val idx = clean.lowercase().indexOf(" $word")
            if (idx != -1) {
                clean = clean.substring(0, idx).trim()
            }
        }
        if (clean.contains("@")) {
            clean = clean.substringBefore("@").trim()
        }
        return clean.takeIf { it.isNotBlank() } ?: "Unknown Merchant"
    }

    private fun extractMerchantFallback(text: String): String {
        val lower = text.lowercase()
        val atIndex = lower.indexOf(" at ")
        if (atIndex != -1) {
            val sub = text.substring(atIndex + 4).trim()
            return cleanMerchant(sub.split(" ").take(3).joinToString(" "))
        }
        val toIndex = lower.indexOf(" to ")
        if (toIndex != -1) {
            val sub = text.substring(toIndex + 4).trim()
            return cleanMerchant(sub.split(" ").take(3).joinToString(" "))
        }
        return "Unknown Merchant"
    }

    private fun resolveSourceApp(packageName: String, title: String): String {
        val lowerPkg = packageName.lowercase()
        val lowerTitle = title.lowercase()
        return when {
            lowerPkg.contains("google.android.apps.nbu.paisa") || lowerTitle.contains("gpay") || lowerTitle.contains("google pay") -> "GPay"
            lowerPkg.contains("phonepe") || lowerTitle.contains("phonepe") -> "PhonePe"
            lowerPkg.contains("paytm") || lowerTitle.contains("paytm") -> "Paytm"
            lowerPkg.contains("pop.upi") || lowerTitle.contains("pop upi") || lowerTitle.contains("pop") -> "POP UPI"
            lowerPkg.contains("messaging") || lowerPkg.contains("sms") || lowerPkg.contains("mms") -> "SMS"
            packageName.isNotBlank() -> {
                packageName.substringAfterLast('.').replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.ROOT) else it.toString() }
            }
            else -> "System"
        }
    }
}
