package com.pixel.reimburse.transactions

import android.util.Log
import java.util.Locale
import java.util.regex.Pattern

object TransactionParser {
    private const val TAG = "TRANSACTION_DEBUG"

    // Scoring Constants
    private const val SCORE_DEBITED = 40
    private const val SCORE_CREDITED = 40
    private const val SCORE_UPI = 35
    private const val SCORE_ACCOUNT_KW = 30
    private const val SCORE_REF_KW = 25
    private const val SCORE_BANK_KW = 20
    private const val SCORE_MASKED_ACC = 15
    private const val SCORE_DATE = 15
    private const val SCORE_TXN_ID = 15

    private const val PENALTY_OFFER = -50
    private const val PENALTY_SALE = -50
    private const val PENALTY_CASHBACK = -40
    private const val PENALTY_PROMO = -40
    private const val PENALTY_EMOJI = -30
    private const val PENALTY_CONV = -30

    private const val THRESHOLD_MIN_CONFIDENCE = 65

    // Keywords
    private val DEBIT_KEYWORDS = listOf("debited", "debit", "deducted", "deduction", "charged", "transferred", "paid", "withdrawn", "spent", "trf to", "sent to", "purchase", "payment made")
    private val CREDIT_KEYWORDS = listOf("credited", "credit", "received", "deposited", "refund received", "salary credited", "cash deposit", "received from", "credited by")
    private val UPI_KEYWORDS = listOf("upi", "vpa", "bhim", "phonepe", "gpay", "paytm")
    private val ACCOUNT_KEYWORDS = listOf("a/c", "account", "acc ", "acct")
    private val REF_KEYWORDS = listOf("ref", "refno", "reference", "txn", "id:", "tran id")
    private val BANK_KEYWORDS = listOf("bank", "imps", "neft", "rtgs", "card", "hdfc", "icici", "sbi", "axis", "kotak")
    
    private val NEGATIVE_OFFER = listOf("offer", "discount", "coupon", "deal", "limited time", "save big")
    private val NEGATIVE_SALE = listOf("sale", "clearance", "off on", "% off", "priced at")
    private val NEGATIVE_PROMO = listOf("promo", "advertisement", "free", "win", "gift voucher", "congratulations")

    // Extraction Patterns
    private val AMOUNT_PATTERN = Pattern.compile("(?:₹|Rs\\.?|INR)\\s*([\\d,]+\\.?\\d*)", Pattern.CASE_INSENSITIVE)
    private val MASKED_ACC_PATTERN = Pattern.compile("(?:X+|\\*+)(\\d{3,6})", Pattern.CASE_INSENSITIVE)
    private val DATE_PATTERN = Pattern.compile("(\\d{1,2}[-/](?:\\d{1,2}|[a-zA-Z]{3})[-/]\\d{2,4})", Pattern.CASE_INSENSITIVE)
    private val REF_ID_PATTERN = Pattern.compile("(?:ref|txn|id)[:\\s]*([A-Z0-9]{8,20})", Pattern.CASE_INSENSITIVE)

    fun parseTransaction(text: String, packageName: String? = null, title: String? = null, extractionSource: String = "Unknown"): ParsedTransactionInfo {
        Log.d(TAG, "--- STARTING PARSE PIPELINE ---")
        Log.d(TAG, "[STAGE 1: RAW] $text")

        // STAGE 2: Normalize
        val normalized = normalizeMessage(text, title)
        val lowerText = normalized.lowercase()
        Log.d(TAG, "[STAGE 2: NORMALIZED] $normalized")

        // STAGE 3: Source Validation
        val sourceApp = resolveSourceApp(packageName ?: "", title ?: "")
        Log.d(TAG, "[STAGE 3: SOURCE] $sourceApp ($packageName)")

        // STAGE 4: Keyword Scoring & STAGE 5: Classification
        val scoreBreakdown = mutableMapOf<String, Int>()
        val matchedKeywords = mutableListOf<String>()
        val negativeKeywords = mutableListOf<String>()
        var type = "unknown"

        // Positive Scoring
        var hasDebit = false
        for (kw in DEBIT_KEYWORDS) {
            if (lowerText.contains(kw)) {
                scoreBreakdown["DEBIT_KW"] = SCORE_DEBITED
                matchedKeywords.add(kw)
                hasDebit = true
                break
            }
        }
        var hasCredit = false
        for (kw in CREDIT_KEYWORDS) {
            if (lowerText.contains(kw)) {
                scoreBreakdown["CREDIT_KW"] = SCORE_CREDITED
                matchedKeywords.add(kw)
                hasCredit = true
                break
            }
        }

        if (hasDebit && hasCredit) {
            // Conflict resolution: Prioritize debit if strong action verbs are present
            if (lowerText.contains("debited") || 
                lowerText.contains("deducted") || 
                lowerText.contains("deduction") || 
                lowerText.contains("spent") || 
                lowerText.contains("paid") || 
                lowerText.contains("withdrawn") || 
                lowerText.contains("charged")) {
                type = "debit"
            } else {
                type = "credit"
            }
        } else if (hasDebit) {
            type = "debit"
        } else if (hasCredit) {
            type = "credit"
        }
        
        if (UPI_KEYWORDS.any { lowerText.contains(it) }) {
            scoreBreakdown["UPI"] = SCORE_UPI
            matchedKeywords.add("upi")
        }
        if (ACCOUNT_KEYWORDS.any { lowerText.contains(it) }) {
            scoreBreakdown["ACCOUNT_KW"] = SCORE_ACCOUNT_KW
            matchedKeywords.add("account_kw")
        }
        if (REF_KEYWORDS.any { lowerText.contains(it) }) {
            scoreBreakdown["REF_KW"] = SCORE_REF_KW
            matchedKeywords.add("ref_kw")
        }
        if (BANK_KEYWORDS.any { lowerText.contains(it) }) {
            scoreBreakdown["BANK_KW"] = SCORE_BANK_KW
            matchedKeywords.add("bank_kw")
        }

        // Negative Scoring
        if (NEGATIVE_OFFER.any { lowerText.contains(it) }) {
            scoreBreakdown["NEG_OFFER"] = PENALTY_OFFER
            negativeKeywords.add("offer")
        }
        if (NEGATIVE_SALE.any { lowerText.contains(it) }) {
            scoreBreakdown["NEG_SALE"] = PENALTY_SALE
            negativeKeywords.add("sale")
        }
        if (NEGATIVE_PROMO.any { lowerText.contains(it) }) {
            scoreBreakdown["NEG_PROMO"] = PENALTY_PROMO
            negativeKeywords.add("promo")
        }
        if (Regex("[\\uD83C-\\uDBFF\\uDC00-\\uDFFF]").containsMatchIn(text)) {
            scoreBreakdown["NEG_EMOJI"] = PENALTY_EMOJI
            negativeKeywords.add("emoji")
        }

        Log.d(TAG, "[STAGE 4/5: SCORING & CLASS] Score: ${scoreBreakdown.values.sum()}, Type: $type")

        // STAGE 6: Entity Extraction
        val amount = extractAmount(normalized)
        val account = extractAccount(normalized)
        val refNo = extractRefNo(normalized)
        val date = extractDate(normalized)
        val merchant = extractMerchant(normalized, type)

        if (account != null) {
            scoreBreakdown["MASKED_ACC"] = SCORE_MASKED_ACC
            matchedKeywords.add("masked_acc")
        }
        if (date != null) {
            scoreBreakdown["DATE"] = SCORE_DATE
            matchedKeywords.add("date")
        }
        if (refNo != null) {
            scoreBreakdown["TXN_ID"] = SCORE_TXN_ID
            matchedKeywords.add("txn_id")
        }

        Log.d(TAG, "[STAGE 6: ENTITIES] Amt: $amount, Acc: $account, Ref: $refNo, Merchant: $merchant")

        // STAGE 7: Confidence Calculation
        val totalScore = scoreBreakdown.values.sum()
        val isPromotional = negativeKeywords.isNotEmpty() && totalScore < THRESHOLD_MIN_CONFIDENCE
        
        Log.d(TAG, "[STAGE 7: CONFIDENCE] Total Score: $totalScore, IsPromo: $isPromotional")

        // STAGE 8: Result
        val info = ParsedTransactionInfo(
            amount = amount,
            merchant = merchant,
            sourceApp = sourceApp,
            confidenceScore = totalScore,
            type = type,
            transactionId = refNo ?: "TXN${System.currentTimeMillis()}",
            rawText = text,
            normalizedText = normalized,
            timestamp = System.currentTimeMillis(),
            account = account,
            referenceNumber = refNo,
            matchedKeywords = matchedKeywords,
            negativeKeywords = negativeKeywords,
            isPromotional = isPromotional,
            extractionSource = extractionSource,
            scoreBreakdown = scoreBreakdown
        )

        Log.d(TAG, "--- PIPELINE COMPLETE (Score: $totalScore) ---")
        return info
    }

    private fun normalizeMessage(text: String, title: String?): String {
        var content = "${title ?: ""} $text".replace("\n", " ").trim()
        // Remove duplicate spaces
        content = content.replace(Regex("\\s+"), " ")
        // Normalize currency formats if needed (e.g. converting Rs to Rs.)
        content = content.replace(Regex("Rs\\s+(\\d)"), "Rs. $1")
        return content
    }

    private fun extractAmount(text: String): Double {
        val matcher = AMOUNT_PATTERN.matcher(text)
        if (matcher.find()) {
            return matcher.group(1)?.replace(",", "")?.toDoubleOrNull() ?: 0.0
        }
        return 0.0
    }

    private fun extractAccount(text: String): String? {
        val matcher = MASKED_ACC_PATTERN.matcher(text)
        if (matcher.find()) return matcher.group(0)
        return null
    }

    private fun extractRefNo(text: String): String? {
        val matcher = REF_ID_PATTERN.matcher(text)
        if (matcher.find()) return matcher.group(1)
        return null
    }

    private fun extractDate(text: String): String? {
        val matcher = DATE_PATTERN.matcher(text)
        if (matcher.find()) return matcher.group(1)
        return null
    }

    private fun extractMerchant(text: String, type: String): String {
        val lowerText = text.lowercase()
        val markers = if (type == "debit") {
            listOf("trf to", "transfer to", "sent to", "paid to", "towards ", "at ", "to ", "for ")
        } else {
            listOf("received from", "credited by", "refunded by", "cashback from", "from ")
        }

        for (marker in markers) {
            val idx = lowerText.indexOf(marker)
            if (idx != -1) {
                val start = idx + marker.length
                var end = text.length
                
                val endMarkers = listOf(" ref", " txn", " on ", " via", " using", " upi:", " a/c", " from", " to", " for")
                for (endM in endMarkers) {
                    val endIdx = lowerText.indexOf(endM, start)
                    if (endIdx != -1 && endIdx < end) end = endIdx
                }
                
                val result = text.substring(start, end).trim()
                val lowerResult = result.lowercase()
                if (result.length in 3..40 && 
                    !lowerResult.contains("account") && 
                    !lowerResult.contains("a/c") && 
                    !lowerResult.contains("acct")) {
                    return result.uppercase()
                }
            }
        }
        return "UNKNOWN MERCHANT"
    }

    private fun resolveSourceApp(packageName: String, title: String): String {
        val lowerPkg = packageName.lowercase()
        return when {
            lowerPkg.contains("google.android.apps.messaging") -> "Google Messages"
            lowerPkg.contains("com.android.messaging") -> "Android Messages"
            lowerPkg.contains("com.google.android.apps.sms") -> "Google SMS"
            packageName.isNotBlank() && !packageName.contains(".") -> packageName
            else -> "System"
        }
    }
}
