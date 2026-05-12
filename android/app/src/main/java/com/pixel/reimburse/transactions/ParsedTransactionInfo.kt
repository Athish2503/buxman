package com.pixel.reimburse.transactions

data class ParsedTransactionInfo(
    val amount: Double,
    val merchant: String,
    val sourceApp: String,
    val confidenceScore: Int,
    val type: String, // "debit" or "credit"
    val transactionId: String,
    val rawText: String,
    val timestamp: Long
)
