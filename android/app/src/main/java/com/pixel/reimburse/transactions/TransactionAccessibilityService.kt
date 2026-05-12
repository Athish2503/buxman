package com.pixel.reimburse.transactions

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class TransactionAccessibilityService : AccessibilityService() {
    companion object {
        private const val TAG = "TRANSACTION_DEBUG"
        private val targetPackages = listOf("google.android.apps.nbu.paisa", "phonepe", "paytm", "pop.upi")
        private val scanKeywords = listOf("paid", "debited", "sent", "transaction successful", "₹")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        val eventType = event.eventType
        if (eventType != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED && eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            return
        }

        val packageName = event.packageName?.toString() ?: return
        if (!targetPackages.any { packageName.contains(it, true) }) {
            return
        }

        val rootNode = try {
            rootInActiveWindow
        } catch (e: Exception) {
            null
        } ?: return

        val extractedText = StringBuilder()
        extractTextRecursively(rootNode, extractedText)
        rootNode.recycle()

        val fullContent = extractedText.toString().trim()
        if (fullContent.isBlank()) return

        // Verify if any critical scan keyword is present in the screen capture
        val lowerContent = fullContent.lowercase()
        if (scanKeywords.any { lowerContent.contains(it) }) {
            Log.d(TAG, "[AccessibilityService] Screen captured text for target [$packageName]:\n$fullContent")
            
            TransactionDetector.processTransactionContent(
                context = this,
                text = fullContent,
                packageName = packageName,
                title = "Accessibility Capture",
                source = "AccessibilityService"
            )
        }
    }

    private fun extractTextRecursively(node: AccessibilityNodeInfo?, builder: StringBuilder) {
        if (node == null) return
        if (node.text != null && node.text.isNotBlank()) {
            builder.append(node.text).append(" | ")
        }
        if (node.contentDescription != null && node.contentDescription.isNotBlank()) {
            builder.append(node.contentDescription).append(" | ")
        }
        for (i in 0 until node.childCount) {
            val child = try {
                node.getChild(i)
            } catch (e: Exception) {
                null
            }
            if (child != null) {
                extractTextRecursively(child, builder)
                child.recycle()
            }
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "TransactionAccessibilityService Interrupted.")
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.i(TAG, "TransactionAccessibilityService Connected and Monitoring Target Windows.")
    }
}
