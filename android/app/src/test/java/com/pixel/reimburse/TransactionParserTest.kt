package com.pixel.reimburse

import com.pixel.reimburse.transactions.TransactionParser
import org.junit.Test
import org.junit.Assert.*

class TransactionParserTest {

    @Test
    fun testGPayDebit() {
        val text = "Paid ₹1,250 to STARBUCKS"
        val result = TransactionParser.parseTransaction(text, "com.google.android.apps.nbu.paisa.user", "GPay")
        assertNotNull(result)
        assertEquals(1250.0, result!!.amount, 0.0)
        assertEquals("STARBUCKS", result.merchant)
        assertEquals("debit", result.type)
        assertTrue(result.confidenceScore >= 50)
    }

    @Test
    fun testPhonePeDebit() {
        val text = "Paid ₹499 to Zomato"
        val result = TransactionParser.parseTransaction(text, "com.phonepe.app", "PhonePe")
        assertNotNull(result)
        assertEquals(499.0, result!!.amount, 0.0)
        assertEquals("Zomato", result.merchant)
    }

    @Test
    fun testBankSMS() {
        val text = "A/c XX1234 debited by ₹500.00 at AMAZON on 10-05-23. Ref: 312345"
        val result = TransactionParser.parseTransaction(text, "com.android.messaging", "SMS")
        assertNotNull(result)
        assertEquals(500.0, result!!.amount, 0.0)
        assertEquals("AMAZON", result.merchant)
    }

    @Test
    fun testHdfcSms() {
        val text = "HDFC Bank: ₹1,500.00 spent at BIG BASKET from A/c XX4567. Not you? Call 1800..."
        val result = TransactionParser.parseTransaction(text, "com.android.messaging", "SMS")
        assertNotNull(result)
        assertEquals(1500.0, result!!.amount, 0.0)
        assertEquals("BIG BASKET", result.merchant)
    }

    @Test
    fun testNoiseFiltering() {
        val text = "Your OTP for HDFC Bank login is 123456. Do not share."
        val result = TransactionParser.parseTransaction(text, "com.android.messaging", "SMS")
        assertNull("OTP should be filtered out", result)
    }

    @Test
    fun testPromotionFiltering() {
        val text = "You are eligible for a loan of ₹5,00,000. Apply now!"
        val result = TransactionParser.parseTransaction(text, "com.android.messaging", "SMS")
        assertNull("Promotion should be filtered out", result)
    }
}
