package com.pixel.reimburse.transactions

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.content.Context
import android.content.res.ColorStateList
import android.os.Bundle
import android.util.Log
import android.view.MotionEvent
import android.view.View
import android.view.animation.AccelerateInterpolator
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import android.animation.ValueAnimator
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.view.ContextThemeWrapper
import com.google.android.material.chip.Chip
import com.pixel.reimburse.R
import com.pixel.reimburse.FinancialNotificationPlugin
import com.pixel.reimburse.databinding.LayoutTransactionOverlayBinding

class OverlayActivity : AppCompatActivity() {

    private lateinit var binding: LayoutTransactionOverlayBinding
    private var selectedCategory: String? = null
    private var isSavingOrDismissing = false

    // Default categories if loading from storage fails
    private var categories: List<String> = listOf("Meals", "Travel", "Shopping", "Health", "Other")

    companion object {
        private const val TAG = "TRANSACTION_DEBUG"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d(TAG, "OverlayActivity created and initializing UI components directly.")

        val amount = intent.getDoubleExtra("amount", 0.0)
        val merchant = intent.getStringExtra("merchant") ?: "Unknown Merchant"
        val appName = intent.getStringExtra("appName") ?: "System"
        val rawText = intent.getStringExtra("rawText") ?: ""
        val type = intent.getStringExtra("type") ?: "debit"
        val confidenceScore = intent.getIntExtra("confidenceScore", 0)
        val account = intent.getStringExtra("account") ?: ""

        // Inflate using view binding
        try {
            binding = LayoutTransactionOverlayBinding.inflate(layoutInflater)
            setContentView(binding.root)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to inflate overlay layout inside activity", e)
            finish()
            return
        }

        setupUI(amount, merchant, appName, type, account)
        setupAnimations()
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        Log.d(TAG, "OverlayActivity onNewIntent called, refreshing UI components.")
        
        // Reset state flags
        isSavingOrDismissing = false
        binding.layoutSuccessAnimation.visibility = View.GONE
        
        val amount = intent.getDoubleExtra("amount", 0.0)
        val merchant = intent.getStringExtra("merchant") ?: "Unknown Merchant"
        val appName = intent.getStringExtra("appName") ?: "System"
        val type = intent.getStringExtra("type") ?: "debit"
        val account = intent.getStringExtra("account") ?: ""

        setupUI(amount, merchant, appName, type, account)
        setupAnimations()
    }

    private fun setupUI(amount: Double, merchant: String, appName: String, type: String, account: String) {
        val isCredit = type == "credit"
        val isQuickAdd = appName == "Widget" && merchant.isBlank() && amount == 0.0
        val accentColor = if (isCredit) 0xFF10B981.toInt() else 0xFFEF4444.toInt() // Emerald Green vs Rose Red
        val displayMerchant = when {
            isQuickAdd -> "Enter merchant name below"
            merchant.isBlank() || merchant == "UNKNOWN MERCHANT" -> "Unknown Merchant"
            else -> merchant
        }
        val displayAccount = if (account.isBlank()) "Account ending ****" else account

        // Value Hierarchy
        if (isQuickAdd) {
            // Quick-add mode: hide static amount/merchant, show editable fields
            binding.tvOverlayAmount.visibility = android.view.View.GONE
            binding.tvOverlayMerchant.visibility = android.view.View.GONE
            binding.etQuickAmount.visibility = android.view.View.VISIBLE
            binding.tvAmountPrefix.visibility = android.view.View.VISIBLE
            binding.etQuickVendor.visibility = android.view.View.VISIBLE
            binding.etQuickAmount.requestFocus()
        } else {
            binding.tvOverlayAmount.text = "₹${"%.2f".format(amount)}"
            binding.tvOverlayAmount.setTextColor(accentColor)
            binding.tvOverlayMerchant.text = "$displayMerchant • $displayAccount"
            binding.tvOverlayAmount.visibility = android.view.View.VISIBLE
            binding.tvOverlayMerchant.visibility = android.view.View.VISIBLE
            binding.etQuickAmount.visibility = android.view.View.GONE
            binding.tvAmountPrefix.visibility = android.view.View.GONE
            binding.etQuickVendor.visibility = android.view.View.GONE
        }

        // Dot Pulsar & Badge Name
        binding.tvSourceApp.text = when {
            isQuickAdd -> "QUICK ADD"
            isCredit -> "CREDIT DETECTED"
            else -> "DEBIT DETECTED"
        }
        binding.tvSourceApp.setTextColor(if (isQuickAdd) 0xFF8B5CF6.toInt() else accentColor)
        binding.ivHeaderDot.setColorFilter(if (isQuickAdd) 0xFF8B5CF6.toInt() else accentColor)

        // Adjust Action buttons & text tint
        binding.btnOverlaySave.backgroundTintList = android.content.res.ColorStateList.valueOf(
            if (isQuickAdd) 0xFF8B5CF6.toInt() else accentColor
        )
        binding.btnOverlaySave.text = when {
            isQuickAdd -> "Save Expense"
            isCredit -> "Record Income"
            else -> "Record Expense"
        }

        // Hide reimbursable switch for credit alerts
        binding.switchReimbursable.visibility = if (isCredit) View.GONE else View.VISIBLE
        binding.switchReimbursable.isChecked = false

        binding.switchSplit.visibility = if (isCredit) View.GONE else View.VISIBLE
        binding.switchSplit.isChecked = false

        // Load and setup contacts chip group
        binding.switchSplit.setOnCheckedChangeListener { _, isChecked ->
            binding.layoutSplitSection.visibility = if (isChecked) View.VISIBLE else View.GONE
            updateSplitSummary(amount)
        }

        binding.btnOverlaySaveUpi.setOnClickListener {
            val enteredUpi = binding.etOverlayUpiId.text.toString().trim()
            if (enteredUpi.isNotBlank()) {
                saveUpiIdToStorage(enteredUpi)
                binding.etOverlayUpiId.clearFocus()
                val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? android.view.inputmethod.InputMethodManager
                imm?.hideSoftInputFromWindow(binding.etOverlayUpiId.windowToken, 0)
                updateSplitSummary(amount)
            }
        }

        val contacts = loadContactsFromStorage()
        if (contacts.isEmpty()) {
            binding.tvSplitSummary.text = "No contacts found. Please add contacts in the main app."
        } else {
            binding.chipGroupSplitContacts.removeAllViews()
            contacts.forEach { (contactId, name) ->
                val themedCtx = ContextThemeWrapper(this, R.style.AppTheme)
                val chip = Chip(themedCtx, null, com.google.android.material.R.attr.chipStyle)
                chip.text = name
                chip.isCheckable = true
                chip.setTextColor(0xFFFFFFFF.toInt())
                chip.chipBackgroundColor = ColorStateList.valueOf(0x1AFFFFFF)
                chip.chipStrokeColor = ColorStateList.valueOf(0x33FFFFFF)
                chip.chipStrokeWidth = 1f
                chip.tag = contactId // Store contactId in tag

                chip.setOnCheckedChangeListener { _, _ ->
                    updateSplitSummary(amount)
                }
                binding.chipGroupSplitContacts.addView(chip)
            }
        }

        // Load and setup dynamic category chips
        binding.chipGroupOverlayCategories.removeAllViews()
        val currentCategories = if (isCredit) {
            listOf("Salary", "Refund", "Cash Deposit", "Gift", "Other")
        } else {
            loadCategoriesFromStorage()
        }

        currentCategories.forEach { category ->
            // Wrap in themed wrapper for Chip widget styling consistency
            val themedCtx = ContextThemeWrapper(this, R.style.AppTheme)
            val chip = Chip(themedCtx, null, com.google.android.material.R.attr.chipStyle)
            chip.text = category
            chip.isCheckable = true
            chip.setTextColor(0xFFFFFFFF.toInt())
            chip.chipBackgroundColor = ColorStateList.valueOf(0x1AFFFFFF)
            chip.chipStrokeColor = ColorStateList.valueOf(0x33FFFFFF)
            chip.chipStrokeWidth = 1f

            chip.setOnCheckedChangeListener { _, isChecked ->
                if (isChecked) {
                    selectedCategory = category
                    chip.chipBackgroundColor = ColorStateList.valueOf(accentColor)
                    chip.chipStrokeWidth = 0f
                } else {
                    if (selectedCategory == category) selectedCategory = null
                    chip.chipBackgroundColor = ColorStateList.valueOf(0x1AFFFFFF)
                    chip.chipStrokeWidth = 1f
                }
            }
            binding.chipGroupOverlayCategories.addView(chip)
        }

        // Close/Dismiss buttons
        binding.btnCloseOverlay.setOnClickListener { dismissWithAnimation() }
        binding.btnOverlayDismiss.setOnClickListener {
            FinancialNotificationPlugin.onOverlayAction(this, "dismiss", amount, merchant)
            dismissWithAnimation()
        }

        binding.btnOverlaySave.setOnClickListener {
            if (isSavingOrDismissing) return@setOnClickListener
            binding.btnOverlaySave.isEnabled = false
            
            val notes = binding.etOverlayNotes.text.toString()
            val category = selectedCategory ?: if (isCredit) "Income" else "Other"
            val isReimbursement = if (isCredit) false else binding.switchReimbursable.isChecked
            val splitContacts = if (binding.switchSplit.isChecked) getSelectedContacts() else emptyList()

            // In quick-add mode, read amount and merchant from editable fields
            val finalAmount = if (isQuickAdd) {
                binding.etQuickAmount.text.toString().toDoubleOrNull() ?: 0.0
            } else amount
            val finalMerchant = if (isQuickAdd) {
                binding.etQuickVendor.text.toString().trim().ifBlank { "Quick Add" }
            } else merchant

            if (isQuickAdd && finalAmount <= 0.0) {
                binding.etQuickAmount.error = "Enter an amount"
                binding.etQuickAmount.requestFocus()
                binding.btnOverlaySave.isEnabled = true
                return@setOnClickListener
            }

            Log.d(TAG, "Saving: $finalMerchant | $finalAmount | Category: $category")
            val success = persistTransactionNatively(finalAmount, finalMerchant, category, notes, type, isReimbursement, splitContacts)

            if (success) {
                FinancialNotificationPlugin.onOverlayAction(this, "save", finalAmount, finalMerchant, category, notes, true, isReimbursement)
                playSuccessAnimationAndDismiss()
            } else {
                binding.btnOverlaySave.isEnabled = true
                binding.btnOverlaySave.text = "Retry Save"
                binding.btnOverlaySave.backgroundTintList = ColorStateList.valueOf(0xFFF59E0B.toInt())
            }
        }

        // Setup touch-outside layout clicks to dismiss
        binding.overlayRoot.setOnClickListener {
            dismissWithAnimation()
        }
        binding.cardContainer.setOnClickListener {
            // Consume event to block touches from dismissing activity
        }

        // Drag to dismiss swipe gesture setup
        setupDragBehavior()
    }

    private fun setupAnimations() {
        binding.cardContainer.apply {
            alpha = 0f
            scaleX = 0.85f
            scaleY = 0.85f
            translationY = 150f
            animate()
                .alpha(1f)
                .scaleX(1f)
                .scaleY(1f)
                .translationY(0f)
                .setDuration(450)
                .setInterpolator(OvershootInterpolator(1.1f))
                .start()
        }
    }

    private fun setupDragBehavior() {
        binding.cardContainer.setOnTouchListener(object : View.OnTouchListener {
            private var initialTouchY = 0f
            private var initialY = 0f

            override fun onTouch(v: View, event: MotionEvent): Boolean {
                if (isSavingOrDismissing) return false

                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialTouchY = event.rawY
                        initialY = binding.cardContainer.translationY
                        return true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        val deltaY = event.rawY - initialTouchY
                        // Only allow dragging upwards or slightly downwards
                        if (deltaY < 0) {
                            binding.cardContainer.translationY = initialY + deltaY
                            binding.cardContainer.alpha = (1f + deltaY / 600f).coerceIn(0.3f, 1f)
                        } else {
                            binding.cardContainer.translationY = initialY + (deltaY * 0.5f) // drag resistance
                        }
                        return true
                    }
                    MotionEvent.ACTION_UP -> {
                        val deltaY = event.rawY - initialTouchY
                        if (deltaY < -200) {
                            dismissWithAnimation()
                        } else {
                            // Snap back
                            binding.cardContainer.animate()
                                .translationY(0f)
                                .alpha(1f)
                                .setDuration(250)
                                .setInterpolator(OvershootInterpolator())
                                .start()
                        }
                        return true
                    }
                }
                return false
            }
        })
    }

    private fun dismissWithAnimation() {
        if (isSavingOrDismissing) return
        isSavingOrDismissing = true

        binding.cardContainer.animate()
            .alpha(0f)
            .scaleX(0.9f)
            .scaleY(0.9f)
            .translationY(-150f)
            .setDuration(300)
            .setInterpolator(AccelerateInterpolator())
            .setListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    finish()
                    overridePendingTransition(0, 0)
                }
            })
            .start()
    }

    private fun playSuccessAnimationAndDismiss() {
        isSavingOrDismissing = true
        binding.etOverlayNotes.clearFocus()

        // Reveal the success animation layer overlay inside the card
        binding.layoutSuccessAnimation.apply {
            visibility = View.VISIBLE
            alpha = 0f
            animate().alpha(1f).setDuration(200).start()
        }

        // Scale animate the checkmark tick
        binding.ivSuccessTick.apply {
            scaleX = 0f
            scaleY = 0f
            animate()
                .scaleX(1.1f)
                .scaleY(1.1f)
                .setDuration(400)
                .setInterpolator(OvershootInterpolator(2f))
                .withEndAction {
                    animate().scaleX(1f).scaleY(1f).setDuration(150).start()
                }
                .start()
        }

        // Expand burst outer ring aura
        binding.viewBurstRing.apply {
            scaleX = 0.1f
            scaleY = 0.1f
            alpha = 1f
            animate()
                .scaleX(3.5f)
                .scaleY(3.5f)
                .alpha(0f)
                .setDuration(600)
                .setInterpolator(DecelerateInterpolator())
                .start()
        }

        // Delayed finish execution after animations finish
        binding.root.postDelayed({
            finish()
            overridePendingTransition(0, 0)
        }, 1100)
    }

    private fun loadCategoriesFromStorage(): List<String> {
        try {
            val prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val categoryKey = "reimburse_categories_v1"
            val jsonStr = prefs.getString(categoryKey, null)
            if (jsonStr != null) {
                val array = org.json.JSONArray(jsonStr)
                val list = mutableListOf<String>()
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    if (obj.optBoolean("isVisible", true)) {
                        list.add(obj.getString("label"))
                    }
                }
                if (list.isNotEmpty()) return list
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load categories from CapacitorStorage", e)
        }
        return categories
    }

    private fun loadContactsFromStorage(): List<Pair<String, String>> {
        val list = mutableListOf<Pair<String, String>>()
        try {
            val prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val contactsKey = "reimburse_contacts"
            val jsonStr = prefs.getString(contactsKey, null)
            if (jsonStr != null) {
                val array = org.json.JSONArray(jsonStr)
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    val id = obj.getString("id")
                    val name = obj.getString("name")
                    list.add(Pair(id, name))
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load contacts from CapacitorStorage", e)
        }
        return list
    }

    private fun loadUpiIdFromStorage(): String? {
        try {
            val prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val settingsKey = "reimburse_settings_v2"
            val jsonStr = prefs.getString(settingsKey, null)
            if (jsonStr != null) {
                val obj = org.json.JSONObject(jsonStr)
                val upiId = obj.optString("upiId", "")
                if (upiId.isNotBlank()) return upiId
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load upiId from CapacitorStorage", e)
        }
        return null
    }

    private fun loadUserNameFromStorage(): String {
        try {
            val prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val settingsKey = "reimburse_settings_v2"
            val jsonStr = prefs.getString(settingsKey, null)
            if (jsonStr != null) {
                val obj = org.json.JSONObject(jsonStr)
                val billedFrom = obj.optJSONObject("billedFrom")
                if (billedFrom != null) {
                    val name = billedFrom.optString("name")
                    if (!name.isNullOrBlank()) return name
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load userName from CapacitorStorage", e)
        }
        return "User"
    }

    private fun loadSettingsFromStorage(): org.json.JSONObject? {
        try {
            val prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val settingsKey = "reimburse_settings_v2"
            val jsonStr = prefs.getString(settingsKey, null)
            if (jsonStr != null) {
                return org.json.JSONObject(jsonStr)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load settings from CapacitorStorage", e)
        }
        return null
    }

    private fun saveUpiIdToStorage(upiId: String) {
        try {
            val prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val settingsKey = "reimburse_settings_v2"
            val jsonStr = prefs.getString(settingsKey, null)
            val settingsObj = if (jsonStr != null) {
                org.json.JSONObject(jsonStr)
            } else {
                org.json.JSONObject()
            }
            settingsObj.put("upiId", upiId)
            prefs.edit().putString(settingsKey, settingsObj.toString()).commit()
            Log.d(TAG, "UPI ID saved natively: $upiId")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save UPI ID natively", e)
        }
    }

    private fun updateSplitSummary(totalAmount: Double) {
        val selectedChips = getSelectedContacts()
        if (selectedChips.isEmpty()) {
            binding.tvSplitSummary.text = "Select contacts to see split details"
            binding.layoutOverlayUpiSetup.visibility = View.GONE
            binding.layoutOverlayQrContainer.visibility = View.GONE
            return
        }

        val totalPeople = selectedChips.size + 1
        val splitAmount = totalAmount / totalPeople
        val formattedSplit = "₹%,.2f".format(splitAmount)
        binding.tvSplitSummary.text = "Split equally: $totalPeople people. Your share: $formattedSplit. Others owe: $formattedSplit each."

        val upiId = loadUpiIdFromStorage()
        if (upiId.isNullOrBlank()) {
            binding.layoutOverlayUpiSetup.visibility = View.VISIBLE
            binding.layoutOverlayQrContainer.visibility = View.GONE
        } else {
            binding.layoutOverlayUpiSetup.visibility = View.GONE
            binding.layoutOverlayQrContainer.visibility = View.VISIBLE

            val name = loadUserNameFromStorage()
            val upiUrl = "upi://pay?pa=${upiId.trim()}&pn=${java.net.URLEncoder.encode(name, "UTF-8")}&am=${"%.2f".format(splitAmount)}&cu=INR"

            val settings = loadSettingsFromStorage()
            val accentColorHex = settings?.optString("accentColor", "#7C3AED") ?: "#7C3AED"
            val darkColor = try {
                android.graphics.Color.parseColor(accentColorHex)
            } catch (e: Exception) {
                0xFF7C3AED.toInt()
            }

            val qrBitmap = QRCodeGenerator.generate(upiUrl, 400, darkColor, android.graphics.Color.WHITE)
            if (qrBitmap != null) {
                binding.ivOverlayQr.setImageBitmap(qrBitmap)
                binding.tvOverlayQrDetails.text = "Scan to pay ₹${"%.2f".format(splitAmount)} to $upiId"
            }
        }
    }

    private fun getSelectedContacts(): List<Pair<String, String>> {
        val list = mutableListOf<Pair<String, String>>()
        try {
            for (i in 0 until binding.chipGroupSplitContacts.childCount) {
                val chip = binding.chipGroupSplitContacts.getChildAt(i) as? Chip
                if (chip != null && chip.isChecked) {
                    val contactId = chip.tag as? String ?: ""
                    val name = chip.text.toString()
                    list.add(Pair(contactId, name))
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get selected contacts", e)
        }
        return list
    }

    private fun persistTransactionNatively(
        amount: Double, 
        merchant: String, 
        category: String, 
        notes: String, 
        type: String, 
        isReimbursement: Boolean,
        selectedContacts: List<Pair<String, String>> = emptyList()
    ): Boolean {
        try {
            val prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val storageKey = "reimburse_expenses_v2"
            val existingJsonStr = prefs.getString(storageKey, "[]") ?: "[]"
            val jsonArray = org.json.JSONArray(existingJsonStr)

            val now = System.currentTimeMillis()
            val dateStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date(now))
            val isoTimeStr = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }.format(java.util.Date(now))

            val splitObj = if (selectedContacts.isNotEmpty()) {
                val totalPeople = selectedContacts.size + 1
                val splitAmount = amount / totalPeople
                
                val membersArray = org.json.JSONArray()
                for (contact in selectedContacts) {
                    val memberObj = org.json.JSONObject().apply {
                        put("contactId", contact.first)
                        put("amount", splitAmount)
                        put("paid", false)
                    }
                    membersArray.put(memberObj)
                }
                
                org.json.JSONObject().apply {
                    put("totalAmount", amount)
                    put("splitType", "equal")
                    put("userPaid", true)
                    put("members", membersArray)
                }
            } else null

            val newExpense = org.json.JSONObject().apply {
                put("id", "TXN_" + java.util.UUID.randomUUID().toString().substring(0, 8))
                put("date", dateStr)
                put("vendor", merchant)
                put("category", category)
                put("amount", amount)
                put("currency", "INR")
                put("description", notes.ifBlank { "Captured via Smart Overlay" })
                put("status", "approved")
                put("type", type)
                put("isReimbursement", isReimbursement)
                put("createdAt", isoTimeStr)
                put("updatedAt", isoTimeStr)
                if (splitObj != null) {
                    put("split", splitObj)
                }
            }

            val updatedArray = org.json.JSONArray().apply {
                put(newExpense)
                for (i in 0 until jsonArray.length()) put(jsonArray.getJSONObject(i))
            }

            return prefs.edit().putString(storageKey, updatedArray.toString()).commit()
        } catch (e: Exception) {
            Log.e(TAG, "Persistence failure", e)
            return false
        }
    }
}
