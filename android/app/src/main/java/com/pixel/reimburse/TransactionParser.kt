package com.pixel.reimburse

import android.util.Log
import java.util.regex.Pattern

data class ParsedTransaction(
    val amount: Double,
    val merchant: String,
    val type: String, // "debit" or "credit"
    val appName: String,
    val timestamp: Long,
    val rawText: String,
    val reference: String? = null,
    val accountSuffix: String? = null
)

interface TransactionParserStrategy {
    fun parse(packageName: String, title: String, text: String, timestamp: Long): ParsedTransaction?
}

class GPayParser : TransactionParserStrategy {
    private val debitPattern = Pattern.compile("(?:Paid|Sent) (?:₹|Rs\\.?)\\s*([\\d,]+\\.?\\d*) to (.*)", Pattern.CASE_INSENSITIVE)
    
    override fun parse(packageName: String, title: String, text: String, timestamp: Long): ParsedTransaction? {
        if (packageName != "com.google.android.apps.nbu.paisa.user") return null
        
        val matcher = debitPattern.matcher(text)
        if (matcher.find()) {
            val amount = matcher.group(1)?.replace(",", "")?.toDoubleOrNull() ?: 0.0
            val merchant = matcher.group(2)?.trim() ?: "Unknown"
            return ParsedTransaction(
                amount = amount,
                merchant = merchant,
                type = "debit",
                appName = "GPay",
                timestamp = timestamp,
                rawText = text
            )
        }
        return null
    }
}

class PhonePeParser : TransactionParserStrategy {
    private val debitPattern = Pattern.compile("Paid (?:₹|Rs\\.?)\\s*([\\d,]+\\.?\\d*) to (.*)", Pattern.CASE_INSENSITIVE)
    
    override fun parse(packageName: String, title: String, text: String, timestamp: Long): ParsedTransaction? {
        if (packageName != "com.phonepe.app") return null
        
        val matcher = debitPattern.matcher(text)
        if (matcher.find()) {
            val amount = matcher.group(1)?.replace(",", "")?.toDoubleOrNull() ?: 0.0
            val merchant = matcher.group(2)?.trim() ?: "Unknown"
            return ParsedTransaction(
                amount = amount,
                merchant = merchant,
                type = "debit",
                appName = "PhonePe",
                timestamp = timestamp,
                rawText = text
            )
        }
        return null
    }
}

class PaytmParser : TransactionParserStrategy {
    private val debitPattern = Pattern.compile("Paid (?:₹|Rs\\.?)\\s*([\\d,]+\\.?\\d*) to (.*)", Pattern.CASE_INSENSITIVE)
    
    override fun parse(packageName: String, title: String, text: String, timestamp: Long): ParsedTransaction? {
        if (packageName != "net.one97.paytm") return null
        
        val matcher = debitPattern.matcher(text)
        if (matcher.find()) {
            val amount = matcher.group(1)?.replace(",", "")?.toDoubleOrNull() ?: 0.0
            val merchant = matcher.group(2)?.trim() ?: "Unknown"
            return ParsedTransaction(
                amount = amount,
                merchant = merchant,
                type = "debit",
                appName = "Paytm",
                timestamp = timestamp,
                rawText = text
            )
        }
        return null
    }
}

class SpecialistParser : TransactionParserStrategy {
    private val amazonPayRegex = Regex("Amazon Pay: (?:Paid|Spent) ₹(\\d+\\.?\\d*) at (.*)\\. (Ref: \\d+)?", RegexOption.IGNORE_CASE)
    private val sbiRegex = Regex("txn of ₹(\\d+\\.?\\d*) at (.*) (?:on|at) (.*) ref (\\d+)", RegexOption.IGNORE_CASE)

    override fun parse(packageName: String, title: String, text: String, timestamp: Long): ParsedTransaction? {
        // Amazon Pay
        if (packageName.contains("amazon") || text.contains("Amazon Pay", ignoreCase = true)) {
            val match = amazonPayRegex.find(text)
            if (match != null) {
                return ParsedTransaction(
                    amount = match.groupValues[1].toDouble(),
                    merchant = match.groupValues[2].trim(),
                    type = "debit",
                    appName = "Amazon Pay",
                    timestamp = timestamp,
                    rawText = text,
                    reference = match.groupValues.getOrNull(3)
                )
            }
        }

        // SBI
        if (text.contains("SBI", ignoreCase = true)) {
            val match = sbiRegex.find(text)
            if (match != null) {
                return ParsedTransaction(
                    amount = match.groupValues[1].toDouble(),
                    merchant = match.groupValues[2].trim(),
                    type = "debit",
                    appName = "SBI",
                    timestamp = timestamp,
                    rawText = text,
                    reference = match.groupValues.getOrNull(4)
                )
            }
        }
        return null
    }
}

class GenericBankParser : TransactionParserStrategy {
    private val debitKeywords = listOf("debited", "spent", "paid", "transaction at", "purchased")
    private val creditKeywords = listOf("credited", "received")
    
    private val amountPattern = Pattern.compile("(?:₹|Rs\\.?|INR)\\s*([\\d,]+\\.?\\d*)", Pattern.CASE_INSENSITIVE)
    private val merchantPattern = Pattern.compile("(?:at|to|on)\\s+([^\\s.]+)", Pattern.CASE_INSENSITIVE)
    private val accountPattern = Pattern.compile("(?:a/c|acc|account).*?(\\d{4})", Pattern.CASE_INSENSITIVE)

    override fun parse(packageName: String, title: String, text: String, timestamp: Long): ParsedTransaction? {
        val combined = "$title $text".lowercase()
        
        val isDebit = debitKeywords.any { combined.contains(it) }
        val isCredit = creditKeywords.any { combined.contains(it) }
        
        if (!isDebit && !isCredit) return null
        
        val amountMatcher = amountPattern.matcher(text)
        val amount = if (amountMatcher.find()) amountMatcher.group(1)?.replace(",", "")?.toDoubleOrNull() ?: 0.0 else 0.0
        
        if (amount == 0.0) return null
        
        val merchantMatcher = merchantPattern.matcher(text)
        val merchant = if (merchantMatcher.find()) merchantMatcher.group(1)?.trim() ?: "Unknown" else "Unknown"
        
        val accountMatcher = accountPattern.matcher(text)
        val accountSuffix = if (accountMatcher.find()) accountMatcher.group(1) else null

        return ParsedTransaction(
            amount = amount,
            merchant = merchant,
            type = if (isDebit) "debit" else "credit",
            appName = packageName.split(".").last().capitalize(),
            timestamp = timestamp,
            rawText = text,
            accountSuffix = accountSuffix
        )
    }
}

class TransactionParserEngine {
    private val strategies = listOf(
        GPayParser(),
        PhonePeParser(),
        PaytmParser(),
        SpecialistParser(),
        GenericBankParser()
    )

    fun parse(packageName: String, title: String, text: String, timestamp: Long): ParsedTransaction? {
        val combined = "$title $text".lowercase()
        if (combined.contains("otp") || combined.contains("verification code") || combined.contains("login")) {
            return null
        }

        for (strategy in strategies) {
            try {
                val result = strategy.parse(packageName, title, text, timestamp)
                if (result != null) {
                    return result
                }
            } catch (e: Exception) {
                Log.e("TransactionParser", "Error parsing with ${strategy.javaClass.simpleName}", e)
            }
        }
        return null
    }
}
