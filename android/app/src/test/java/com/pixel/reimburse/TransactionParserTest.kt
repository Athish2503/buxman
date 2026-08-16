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
        assertEquals(1250.0, result.amount, 0.0)
        assertEquals("STARBUCKS", result.merchant)
        assertEquals("debit", result.type)
        assertTrue(result.confidenceScore >= 50)
    }

    @Test
    fun testPhonePeDebit() {
        val text = "Paid ₹499 to Zomato"
        val result = TransactionParser.parseTransaction(text, "com.phonepe.app", "PhonePe")
        assertNotNull(result)
        assertEquals(499.0, result.amount, 0.0)
        assertEquals("ZOMATO", result.merchant)
    }

    @Test
    fun testBankSMS() {
        val text = "A/c XX1234 debited by ₹500.00 at AMAZON on 10-05-23. Ref: 312345"
        val result = TransactionParser.parseTransaction(text, "com.android.messaging", "SMS")
        assertNotNull(result)
        assertEquals(500.0, result.amount, 0.0)
        assertEquals("AMAZON", result.merchant)
    }

    @Test
    fun testHdfcSms() {
        val text = "HDFC Bank: ₹1,500.00 spent at BIG BASKET from A/c XX4567. Not you? Call 1800..."
        val result = TransactionParser.parseTransaction(text, "com.android.messaging", "SMS")
        assertNotNull(result)
        assertEquals(1500.0, result.amount, 0.0)
        assertEquals("BIG BASKET", result.merchant)
    }

    @Test
    fun testNoiseFiltering() {
        val text = "Your OTP for HDFC Bank login is 123456. Do not share."
        val result = TransactionParser.parseTransaction(text, "com.android.messaging", "SMS")
        assertNotNull(result)
        assertEquals("unknown", result.type)
        assertTrue(result.confidenceScore < 40)
    }

    @Test
    fun testPromotionFiltering() {
        val text = "You are eligible for a loan of ₹5,00,000. Apply now!"
        val result = TransactionParser.parseTransaction(text, "com.android.messaging", "SMS")
        assertNotNull(result)
        assertEquals("unknown", result.type)
        assertTrue(result.confidenceScore < 40)
    }

    @Test
    fun testDeductionAndConflict() {
        // Test 1: Deduction keyword and towards/for markers
        val text1 = "Your A/c XXXX has a deduction of Rs 150.00 towards Zomato on 12-05-26."
        val result1 = TransactionParser.parseTransaction(text1, "com.android.messaging", "SMS")
        assertNotNull(result1)
        assertEquals(150.0, result1.amount, 0.0)
        assertEquals("ZOMATO", result1.merchant)
        assertEquals("debit", result1.type)
        assertTrue(result1.confidenceScore >= 40)

        // Test 2: Conflict resolution (contains both debited and credited)
        val text2 = "Your A/c XXXX has been debited for Rs.100.00. Beneficiary A/c credited."
        val result2 = TransactionParser.parseTransaction(text2, "com.android.messaging", "SMS")
        assertNotNull(result2)
        assertEquals(100.0, result2.amount, 0.0)
        assertEquals("debit", result2.type) // Should resolve to debit
    }

    @Test
    fun testUserHdfcVpaFormat() {
        val text = "Rs.500.00 debited from A/c **1234 on 16-Aug-26 via UPI ref no 6228xxxxxxxx to VPA merchant@paytm (Avl Bal: Rs.14,500.00). Call 18002586161 if not done. -HDFC Bank"
        val result = TransactionParser.parseTransaction(text, "com.android.messaging", "SMS")
        assertNotNull(result)
        assertEquals(500.0, result.amount, 0.0)
        assertEquals("MERCHANT@PAYTM", result.merchant)
        assertEquals("debit", result.type)
        assertEquals("**1234", result.account)
        assertTrue(result.confidenceScore >= 50)
    }

    @Test
    fun testSentMessageFormat() {
        val text = "Sent Rs. 500.00 to merchant@paytm via UPI"
        val result = TransactionParser.parseTransaction(text, "com.android.messaging", "SMS")
        assertNotNull(result)
        assertEquals(500.0, result.amount, 0.0)
        assertEquals("MERCHANT@PAYTM", result.merchant)
        assertEquals("debit", result.type)
        assertTrue(result.confidenceScore >= 40)
    }
}
