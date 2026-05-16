package com.pixel.reimburse.transactions

data class ParsedTransactionInfo(
    val amount: Double,
    val merchant: String,
    val sourceApp: String,
    val confidenceScore: Int,
    val type: String, // "debit", "credit", or "unknown"
    val transactionId: String,
    val rawText: String,
    val normalizedText: String = "",
    val timestamp: Long,
    val account: String? = null,
    val bankName: String? = null,
    val referenceNumber: String? = null,
    val matchedKeywords: List<String> = emptyList(),
    val negativeKeywords: List<String> = emptyList(),
    val rejectionReason: String? = null,
    val extractionSource: String = "Unknown",
    val isPromotional: Boolean = false,
    val scoreBreakdown: Map<String, Int> = emptyMap()
)

