package com.pixel.reimburse.transactions

import android.util.Log
import java.util.Locale
import java.util.regex.Pattern

object TransactionParser {
    private const val TAG = "TRANSACTION_DEBUG"

    // Confidence Weights
    private const val WEIGHT_CURRENCY = 15
    private const val WEIGHT_ACCOUNT = 20
    private const val WEIGHT_BANKING_KEYWORD = 15
    private const val WEIGHT_ACTION_KEYWORD = 30
    private const val WEIGHT_TXN_ID = 15
    private const val WEIGHT_SENDER_BANK = 10
    
    private const val THRESHOLD_MIN_CONFIDENCE = 50

    // Keywords
    private val DEBIT_KEYWORDS = listOf("debited", "debit", "paid", "withdrawn", "spent", "trf to", "sent to", "purchase", "payment made")
    private val CREDIT_KEYWORDS = listOf("credited", "credit", "received", "deposited", "refund received", "salary credited", "cash deposit", "received from", "credited by")
    private val GENERAL_BANKING_KEYWORDS = listOf("upi", "a/c", "account", "refno", "transaction", "imps", "neft", "bank", "debit card", "credit card")
    
    private val NEGATIVE_INDICATORS = listOf("offer", "sale", "discount", "coupon", "cashback offer", "advertisement", "promo", "otp", "verification code", "login attempt")

    // Patterns
    private val AMOUNT_PATTERN = Pattern.compile("(?:₹|Rs\\.?|INR)\\s*([\\d,]+\\.?\\d*)", Pattern.CASE_INSENSITIVE)
    private val ACCOUNT_PATTERN = Pattern.compile("(?:A/c|Acc|Account|A/c no|Acct)\\s*[:\\s]*([*X0-9]{3,18})", Pattern.CASE_INSENSITIVE)
    private val REF_NO_PATTERN = Pattern.compile("(?:ref|txn|reference|id|upi txn id|refno)[:\\s]+([A-Z0-9]{8,15})", Pattern.CASE_INSENSITIVE)
    private val BANK_NAME_PATTERN = Pattern.compile("(?:at|via|by|with|from|to)\\s+([A-Z\\s]{2,15})(?:\\s+bank|\\s+ref|\\s+on|\\s+$)")

    fun parseTransaction(text: String, packageName: String? = null, title: String? = null): ParsedTransactionInfo? {
        val fullText = "${title ?: ""} $text".replace("\n", " ").trim()
        val lowerText = fullText.lowercase()
        
        // 0. Preliminary Negative Filter
        if (NEGATIVE_INDICATORS.any { lowerText.contains(it) }) {
            safeLog("REJECTED: Negative indicator found in text.")
            return null
        }

        var score = 0
        val matchedKeywords = mutableListOf<String>()

        // 1. Amount Check (Mandatory)
        val amountMatcher = AMOUNT_PATTERN.matcher(fullText)
        if (!amountMatcher.find()) {
            safeLog("REJECTED: No amount found.")
            return null
        }
        val amount = parseAmount(amountMatcher.group(1))
        if (amount <= 0.0) {
            safeLog("REJECTED: Amount is zero or invalid.")
            return null
        }
        score += WEIGHT_CURRENCY

        // 2. Identify Transaction Type & Action Keywords
        var type = "unknown"
        var foundAction = false
        
        for (kw in DEBIT_KEYWORDS) {
            if (lowerText.contains(kw)) {
                type = "debit"
                foundAction = true
                score += WEIGHT_ACTION_KEYWORD
                matchedKeywords.add(kw)
                break
            }
        }
        
        if (!foundAction) {
            for (kw in CREDIT_KEYWORDS) {
                if (lowerText.contains(kw)) {
                    type = "credit"
                    foundAction = true
                    score += WEIGHT_ACTION_KEYWORD
                    matchedKeywords.add(kw)
                    break
                }
            }
        }

        // 3. Banking Keywords
        for (kw in GENERAL_BANKING_KEYWORDS) {
            if (lowerText.contains(kw)) {
                score += (WEIGHT_BANKING_KEYWORD / 2) // Partial score for each
                matchedKeywords.add(kw)
                if (score >= 40) break // Cap at some point
            }
        }

        // 4. Account Reference
        val accMatcher = ACCOUNT_PATTERN.matcher(fullText)
        var account: String? = null
        if (accMatcher.find()) {
            account = accMatcher.group(1)
            score += WEIGHT_ACCOUNT
            matchedKeywords.add("account_ref")
        }

        // 5. Transaction ID / Ref No
        val refMatcher = REF_NO_PATTERN.matcher(fullText)
        var refNo: String? = null
        if (refMatcher.find()) {
            refNo = refMatcher.group(1)
            score += WEIGHT_TXN_ID
            matchedKeywords.add("ref_no")
        }

        // 6. Source App / Sender context
        val sourceApp = resolveSourceApp(packageName ?: "", title ?: "")
        if (sourceApp != "System" && sourceApp != "Unknown") {
            score += WEIGHT_SENDER_BANK
        }

        // 7. Merchant / Payee Extraction
        val merchant = extractMerchant(fullText, type)

        // Final Confidence Check
        if (score < THRESHOLD_MIN_CONFIDENCE) {
            safeLog("REJECTED: Confidence score $score too low (Text: $lowerText)")
            return null
        }

        if (type == "unknown") {
            // Default to debit if score is high but type is ambiguous? 
            // Better to reject or mark as debit if it looks like a payment.
            safeLog("REJECTED: Could not determine transaction type (debit/credit).")
            return null
        }

        val info = ParsedTransactionInfo(
            amount = amount,
            merchant = merchant,
            sourceApp = sourceApp,
            confidenceScore = score,
            type = type,
            transactionId = refNo ?: "TXN${System.currentTimeMillis()}",
            rawText = fullText,
            timestamp = System.currentTimeMillis(),
            account = account,
            referenceNumber = refNo,
            matchedKeywords = matchedKeywords
        )

        safeLog("ACCEPTED: Score=$score, Type=$type, Amount=$amount, Merchant=$merchant")
        return info
    }

    private fun extractMerchant(text: String, type: String): String {
        val lowerText = text.lowercase()
        
        // Strategy 1: Look for "trf to", "sent to", "paid to"
        val markers = if (type == "debit") {
            listOf("trf to", "sent to", "paid to", "at", "to")
        } else {
            listOf("received from", "credited by", "from")
        }

        for (marker in markers) {
            val idx = lowerText.indexOf(" $marker ")
            if (idx != -1) {
                val start = idx + marker.length + 2
                var end = text.length
                
                // Possible end markers
                val endMarkers = listOf(" ref", " txn", " on ", " via", " using", " if not", " -", " upi:")
                for (endM in endMarkers) {
                    val endIdx = lowerText.indexOf(endM, start)
                    if (endIdx != -1 && endIdx < end) {
                        end = endIdx
                    }
                }
                
                val result = text.substring(start, end).trim()
                if (result.length in 3..40) {
                    return cleanMerchantName(result)
                }
            }
        }

        return "Unknown Merchant"
    }

    private fun cleanMerchantName(name: String): String {
        var clean = name.replace(Regex("[^a-zA-Z0-9. ]"), "").trim()
        if (clean.contains(" ")) {
             // Take first 3 words max
             val words = clean.split(" ")
             if (words.size > 3) {
                 clean = words.take(3).joinToString(" ")
             }
        }
        return clean.uppercase()
    }

    private fun parseAmount(amountStr: String?): Double {
        return try {
            amountStr?.replace(",", "")?.trim()?.toDoubleOrNull() ?: 0.0
        } catch (e: Exception) {
            0.0
        }
    }

    private fun resolveSourceApp(packageName: String, title: String): String {
        val lowerPkg = packageName.lowercase()
        return when {
            lowerPkg.contains("google.android.apps.messaging") -> "Google Messages"
            lowerPkg.contains("com.android.messaging") -> "Android Messages"
            lowerPkg.contains("com.google.android.apps.sms") -> "Google SMS"
            packageName.isNotBlank() && !packageName.contains(".") -> packageName // Probably a sender ID
            else -> "System"
        }
    }

    private fun safeLog(msg: String) {
        try {
            Log.d(TAG, "[TransactionParser] $msg")
        } catch (e: Exception) {}
    }
}
