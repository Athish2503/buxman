package com.pixel.reimburse

import android.util.Log
import java.util.*
import java.util.regex.Pattern

data class ParsedTransaction(
    val amount: Double,
    val merchant: String,
    val type: String, // "debit" or "credit"
    val appName: String,
    val timestamp: Long,
    val rawText: String,
    val reference: String? = null,
    val accountSuffix: String? = null,
    val confidence: Int = 100, // 0-100
    val currency: String = "INR"
)

/**
 * Advanced Parsing Engine for Financial Transactions
 */
class TransactionParserEngine {
    private val TAG = "TransactionParser"

    // High-confidence patterns for UPI apps
    private val upiPatterns = listOf(
        // GPay / Generic UPI
        Pattern.compile("(?:Paid|Sent|Transfer to)\\s*(?:₹|Rs\\.?|INR)\\s*([\\d,]+\\.?\\d*)\\s*(?:to|at)\\s*(.*)", Pattern.CASE_INSENSITIVE),
        // PhonePe / Paytm
        Pattern.compile("Paid\\s*(?:₹|Rs\\.?|INR)\\s*([\\d,]+\\.?\\d*)\\s*(?:to|at)\\s*(.*)", Pattern.CASE_INSENSITIVE),
        // Successful Transaction
        Pattern.compile("Transaction\\s*(?:of|for)\\s*(?:₹|Rs\\.?|INR)\\s*([\\d,]+\\.?\\d*)\\s*(?:at|to)\\s*(.*)\\s*successful", Pattern.CASE_INSENSITIVE)
    )

    // Bank-specific patterns (SMS and Apps)
    private val bankPatterns = listOf(
        // HDFC / ICICI / SBI / Axis
        Pattern.compile("(?:A/c|Acc|Account).*?(\\d{4}).*?(?:debited|spent|withdrawn).*?(?:₹|Rs\\.?|INR)\\s*([\\d,]+\\.?\\d*).*?(?:at|to|info:)\\s*(.*?)(?:on|\\s|$)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?:₹|Rs\\.?|INR)\\s*([\\d,]+\\.?\\d*).*?(?:debited|spent).*?from.*?(\\d{4})", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Spent\\s*(?:₹|Rs\\.?|INR)\\s*([\\d,]+\\.?\\d*)\\s*at\\s*(.*)\\s*on\\s*Card\\s*.*?(\\d{4})", Pattern.CASE_INSENSITIVE),
        // Credit patterns
        Pattern.compile("(?:A/c|Acc|Account).*?(\\d{4}).*?(?:credited|received).*?(?:₹|Rs\\.?|INR)\\s*([\\d,]+\\.?\\d*)", Pattern.CASE_INSENSITIVE)
    )

    // Keyword based "Noisy" patterns (lower confidence)
    private val debitKeywords = listOf("debited", "spent", "paid", "transaction", "purchased", "sent", "payment successful")
    private val creditKeywords = listOf("credited", "received", "added")
    private val amountPattern = Pattern.compile("(?:₹|Rs\\.?|INR)\\s*([\\d,]+\\.?\\d*)", Pattern.CASE_INSENSITIVE)
    
    // Negative patterns (OTP, Login, etc.)
    private val noisePatterns = listOf(
        Pattern.compile("otp|verification|code|password|login|attempt|request", Pattern.CASE_INSENSITIVE),
        Pattern.compile("offered|limit|eligible|apply|claim", Pattern.CASE_INSENSITIVE)
    )

    fun parse(packageName: String, title: String, text: String, timestamp: Long): ParsedTransaction? {
        val combined = "$title $text"
        
        // 1. Filter out noise early
        if (noisePatterns.any { it.matcher(combined).find() }) {
            return null
        }

        // 2. Identify transaction type
        val isDebit = debitKeywords.any { combined.lowercase().contains(it) }
        val isCredit = creditKeywords.any { combined.lowercase().contains(it) }
        
        if (!isDebit && !isCredit) return null
        val type = if (isDebit) "debit" else "credit"

        // 3. Try High-Confidence UPI Parsers
        for (pattern in upiPatterns) {
            val matcher = pattern.matcher(text)
            if (matcher.find()) {
                val amount = extractAmount(matcher.group(1))
                val merchant = cleanMerchant(matcher.group(2))
                if (amount > 0) {
                    return ParsedTransaction(
                        amount = amount,
                        merchant = merchant,
                        type = type,
                        appName = getReadableAppName(packageName),
                        timestamp = timestamp,
                        rawText = text,
                        confidence = 95
                    )
                }
            }
        }

        // 4. Try Bank Patterns
        for (pattern in bankPatterns) {
            val matcher = pattern.matcher(text)
            if (matcher.find()) {
                // Determine group order based on pattern (this is a bit simplified, ideally would use named groups)
                var amount = 0.0
                var merchant = "Unknown"
                var account: String? = null

                try {
                    if (pattern.toString().contains("A/c")) {
                        account = matcher.group(1)
                        amount = extractAmount(matcher.group(2))
                        merchant = cleanMerchant(matcher.group(3))
                    } else if (pattern.toString().contains("from")) {
                        amount = extractAmount(matcher.group(1))
                        account = matcher.group(2)
                    } else if (pattern.toString().contains("Card")) {
                        amount = extractAmount(matcher.group(1))
                        merchant = cleanMerchant(matcher.group(2))
                        account = matcher.group(3)
                    }
                } catch (e: Exception) {}

                if (amount > 0) {
                    return ParsedTransaction(
                        amount = amount,
                        merchant = merchant,
                        type = type,
                        appName = getReadableAppName(packageName),
                        timestamp = timestamp,
                        rawText = text,
                        accountSuffix = account,
                        confidence = 90
                    )
                }
            }
        }

        // 5. Fallback to Generic extraction (Lowest confidence)
        val amountMatcher = amountPattern.matcher(combined)
        if (amountMatcher.find()) {
            val amount = extractAmount(amountMatcher.group(1))
            if (amount > 0) {
                return ParsedTransaction(
                    amount = amount,
                    merchant = "Unknown Merchant",
                    type = type,
                    appName = getReadableAppName(packageName),
                    timestamp = timestamp,
                    rawText = text,
                    confidence = 60
                )
            }
        }

        return null
    }

    private fun extractAmount(amountStr: String?): Double {
        return amountStr?.replace(",", "")?.toDoubleOrNull() ?: 0.0
    }

    private fun cleanMerchant(merchant: String?): String {
        if (merchant == null) return "Unknown"
        var clean = merchant.trim()
        
        // Remove common suffixes
        val suffixes = listOf("successful", "on", "using", "ref", "txn", "ref no", "at", "to")
        for (s in suffixes) {
            if (clean.lowercase().endsWith(" $s")) {
                clean = clean.substring(0, clean.length - s.length - 1)
            }
        }
        
        // Remove VPA IDs like name@okicici
        if (clean.contains("@")) {
            val parts = clean.split(" ")
            clean = parts.filter { !it.contains("@") }.joinToString(" ")
        }
        
        return if (clean.isEmpty()) "Unknown Merchant" else clean
    }

    private fun getReadableAppName(packageName: String): String {
        return when {
            packageName.contains("google.android.apps.nbu.paisa") -> "GPay"
            packageName.contains("phonepe") -> "PhonePe"
            packageName.contains("paytm") -> "Paytm"
            packageName.contains("amazon") -> "Amazon Pay"
            packageName.contains("whatsapp") -> "WhatsApp"
            packageName.contains("messaging") || packageName.contains("mms") || packageName.contains("sms") -> "SMS"
            else -> {
                val parts = packageName.split(".")
                parts.lastOrNull()?.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.ROOT) else it.toString() } ?: "Bank"
            }
        }
    }
}

