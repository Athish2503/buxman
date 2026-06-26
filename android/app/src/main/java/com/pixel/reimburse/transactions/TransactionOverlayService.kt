package com.pixel.reimburse.transactions

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.util.Log
import android.view.*
import android.view.WindowManager.LayoutParams
import android.widget.EditText
import androidx.appcompat.view.ContextThemeWrapper
import com.google.android.material.chip.Chip
import com.pixel.reimburse.FinancialNotificationPlugin
import com.pixel.reimburse.R
import com.pixel.reimburse.databinding.LayoutTransactionOverlayBinding

class TransactionOverlayService : Service() {
    private lateinit var windowManager: WindowManager
    private var binding: LayoutTransactionOverlayBinding? = null
    private var params: LayoutParams? = null

    companion object {
        private const val TAG = "TRANSACTION_DEBUG"
        var categories: List<String> = listOf("Meals", "Travel", "Shopping", "Health", "Other")
        private var selectedCategory: String? = null
        private var isShowing = false

        fun updateCategories(list: List<String>) {
            categories = list
            Log.d(TAG, "Overlay categories updated: $list")
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val amount = intent?.getDoubleExtra("amount", 0.0) ?: 0.0
        val merchant = intent?.getStringExtra("merchant") ?: "UNKNOWN MERCHANT"
        val appName = intent?.getStringExtra("appName") ?: "System"
        val rawText = intent?.getStringExtra("rawText") ?: ""
        val type = intent?.getStringExtra("type") ?: "debit"
        val account = intent?.getStringExtra("account") ?: "Account ending ****"

        Log.d(TAG, "[OverlayService] Displaying floating overlay for: $merchant")

        if (!Settings.canDrawOverlays(this)) {
            Log.e(TAG, "Cannot show overlay: SYSTEM_ALERT_WINDOW permission missing.")
            stopSelf()
            return START_NOT_STICKY
        }

        showOverlay(amount, merchant, appName, rawText, type, account)
        return START_NOT_STICKY
    }

    private fun showOverlay(amount: Double, merchant: String, appName: String, rawText: String, type: String, account: String) {
        if (isShowing) {
             Log.d(TAG, "Overlay already active, updating content.")
             updateOverlay(amount, merchant, appName, type, account)
             return
        }
        
        isShowing = true
        val themedContext = ContextThemeWrapper(this, R.style.AppTheme)
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager

        try {
            binding = LayoutTransactionOverlayBinding.inflate(LayoutInflater.from(themedContext))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to inflate overlay layout", e)
            isShowing = false
            stopSelf()
            return
        }

        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            LayoutParams.TYPE_PHONE
        }

        params = LayoutParams(
            LayoutParams.MATCH_PARENT,
            LayoutParams.WRAP_CONTENT,
            layoutType,
            LayoutParams.FLAG_NOT_FOCUSABLE or
                    LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP
            y = 120
        }

        setupUI(amount, merchant, appName, type, account)

        try {
            windowManager.addView(binding?.root, params)
        } catch (e: Exception) {
            Log.e(TAG, "Failed adding overlay view", e)
            isShowing = false
            stopSelf()
            return
        }

        // Premium Spring Entrance Animation
        binding?.cardContainer?.apply {
            alpha = 0f
            translationY = -200f
            scaleX = 0.95f
            scaleY = 0.95f
            animate()
                .alpha(1f)
                .translationY(0f)
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(500)
                .setInterpolator(android.view.animation.OvershootInterpolator(1.2f))
                .start()
        }
    }

    private fun updateOverlay(amount: Double, merchant: String, appName: String, type: String, account: String) {
        // Pulse animation to indicate update
        binding?.cardContainer?.animate()
            ?.scaleX(1.02f)
            ?.scaleY(1.02f)
            ?.setDuration(150)
            ?.withEndAction {
                setupUI(amount, merchant, appName, type, account)
                binding?.cardContainer?.animate()?.scaleX(1f)?.scaleY(1f)?.setDuration(150)?.start()
            }?.start()
    }

    private fun setupEditTextFocus(editText: EditText) {
        editText.setOnTouchListener { v, event ->
            if (event.action == MotionEvent.ACTION_UP) {
                params?.let { p ->
                    if ((p.flags and LayoutParams.FLAG_NOT_FOCUSABLE) != 0) {
                        p.flags = p.flags and LayoutParams.FLAG_NOT_FOCUSABLE.inv()
                        try {
                            windowManager.updateViewLayout(binding?.root, p)
                            v.requestFocus()
                            val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as android.view.inputmethod.InputMethodManager
                            imm.showSoftInput(v, android.view.inputmethod.InputMethodManager.SHOW_IMPLICIT)
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to update overlay focus", e)
                        }
                    }
                }
            }
            false
        }

        editText.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus) {
                params?.let { p ->
                    p.flags = p.flags or LayoutParams.FLAG_NOT_FOCUSABLE
                    try {
                        windowManager.updateViewLayout(binding?.root, p)
                        val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as android.view.inputmethod.InputMethodManager
                        imm.hideSoftInputFromWindow(editText.windowToken, 0)
                    } catch (e: Exception) {}
                }
            }
        }
    }

    private fun setupUI(amount: Double, merchant: String, appName: String, type: String, account: String) {
        val b = binding ?: return
        selectedCategory = null

        val isCredit = type == "credit"
        val accentColor = if (isCredit) 0xFF10B981.toInt() else 0xFFEF4444.toInt() // Emerald vs Red
        val displayMerchant = if (merchant.isBlank() || merchant == "UNKNOWN MERCHANT") "Unknown Merchant" else merchant
        val displayAccount = if (account.isBlank()) "Account ending ****" else account

        // Amount hierarchy focus
        b.tvOverlayAmount.text = "₹${"%,.2f".format(amount)}"
        b.tvOverlayAmount.setTextColor(accentColor)
        
        b.tvOverlayMerchant.text = "$displayMerchant • $displayAccount"
        b.tvSourceApp.text = if (isCredit) "CREDIT DETECTED" else "DEBIT DETECTED"
        b.tvSourceApp.setTextColor(accentColor)
        
        // Icon Tint
        val headerIcon = (b.tvSourceApp.parent as android.view.ViewGroup).getChildAt(0) as? android.widget.ImageView
        headerIcon?.setImageResource(if (isCredit) android.R.drawable.presence_online else android.R.drawable.presence_busy)
        headerIcon?.setColorFilter(accentColor)

        b.btnOverlaySave.backgroundTintList = android.content.res.ColorStateList.valueOf(accentColor)
        b.btnOverlaySave.text = if (isCredit) "Record Income" else "Record Expense"

        // Reimbursable switch visibility & default state
        b.switchReimbursable.visibility = if (isCredit) View.GONE else View.VISIBLE
        b.switchReimbursable.isChecked = false

        // Splits and contact section
        b.switchSplit.visibility = if (isCredit) View.GONE else View.VISIBLE
        b.switchSplit.isChecked = false
        b.layoutSplitSection.visibility = View.GONE

        b.switchSplit.setOnCheckedChangeListener { _, isChecked ->
            b.layoutSplitSection.visibility = if (isChecked) View.VISIBLE else View.GONE
            updateSplitSummary(amount)
        }

        b.btnOverlaySaveUpi.setOnClickListener {
            val enteredUpi = b.etOverlayUpiId.text.toString().trim()
            if (enteredUpi.isNotBlank()) {
                saveUpiIdToStorage(enteredUpi)
                b.etOverlayUpiId.clearFocus()
                val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? android.view.inputmethod.InputMethodManager
                imm?.hideSoftInputFromWindow(b.etOverlayUpiId.windowToken, 0)
                updateSplitSummary(amount)
            }
        }

        val contacts = loadContactsFromStorage()
        if (contacts.isEmpty()) {
            b.tvSplitSummary.text = "No contacts found. Please add contacts in the main app."
        } else {
            b.chipGroupSplitContacts.removeAllViews()
            contacts.forEach { (contactId, name) ->
                val themedCtx = ContextThemeWrapper(this, R.style.AppTheme)
                val chip = Chip(themedCtx, null, com.google.android.material.R.attr.chipStyle)
                chip.text = name
                chip.isCheckable = true
                chip.setTextColor(0xFFFFFFFF.toInt())
                chip.chipBackgroundColor = android.content.res.ColorStateList.valueOf(0x1AFFFFFF)
                chip.chipStrokeColor = android.content.res.ColorStateList.valueOf(0x33FFFFFF)
                chip.chipStrokeWidth = 1f
                chip.tag = contactId

                chip.setOnCheckedChangeListener { _, _ ->
                    updateSplitSummary(amount)
                }
                b.chipGroupSplitContacts.addView(chip)
            }
        }

        // Dynamic category chips
        b.chipGroupOverlayCategories.removeAllViews()
        val currentCategories = if (isCredit) listOf("Salary", "Refund", "Cash Deposit", "Gift", "Other") else loadCategoriesFromStorage()
        
        currentCategories.forEach { category ->
            val themedContext = ContextThemeWrapper(this, R.style.AppTheme)
            val chip = Chip(themedContext, null, com.google.android.material.R.attr.chipStyle)
            chip.text = category
            chip.isCheckable = true
            chip.setTextColor(0xFFFFFFFF.toInt())
            chip.chipBackgroundColor = android.content.res.ColorStateList.valueOf(0x1AFFFFFF)
            chip.chipStrokeColor = android.content.res.ColorStateList.valueOf(0x33FFFFFF)
            chip.chipStrokeWidth = 1f

            chip.setOnCheckedChangeListener { _, isChecked ->
                if (isChecked) {
                    selectedCategory = category
                    chip.chipBackgroundColor = android.content.res.ColorStateList.valueOf(accentColor)
                    chip.chipStrokeWidth = 0f
                } else {
                    if (selectedCategory == category) selectedCategory = null
                    chip.chipBackgroundColor = android.content.res.ColorStateList.valueOf(0x1AFFFFFF)
                    chip.chipStrokeWidth = 1f
                }
            }
            b.chipGroupOverlayCategories.addView(chip)
        }

        b.btnCloseOverlay.setOnClickListener { dismissWithAnimation() }
        b.btnOverlayDismiss.setOnClickListener {
            FinancialNotificationPlugin.onOverlayAction(this, "dismiss", amount, merchant)
            dismissWithAnimation()
        }

        b.btnOverlaySave.setOnClickListener {
            b.btnOverlaySave.isEnabled = false
            val notes = b.etOverlayNotes.text.toString()
            val category = selectedCategory ?: if (isCredit) "Income" else "Other"
            val isReimbursement = if (isCredit) false else b.switchReimbursable.isChecked
            val splitContacts = if (b.switchSplit.isChecked) getSelectedContacts() else emptyList()

            Log.d(TAG, "Saving transaction: $merchant | $amount | Reimbursable: $isReimbursement")
            val success = persistTransactionNatively(amount, merchant, category, notes, type, isReimbursement, splitContacts)
            
            if (success) {
                FinancialNotificationPlugin.onOverlayAction(this, "save", amount, merchant, category, notes, true, isReimbursement)
                playSuccessAnimationAndDismiss()
            } else {
                b.btnOverlaySave.isEnabled = true
                b.btnOverlaySave.text = "Retry Save"
                b.btnOverlaySave.backgroundTintList = android.content.res.ColorStateList.valueOf(0xFFF59E0B.toInt()) // Amber
            }
        }

        setupEditTextFocus(b.etOverlayNotes)
        setupEditTextFocus(b.etOverlayUpiId)

        setupDragBehavior()
    }

    private fun setupDragBehavior() {
        val b = binding ?: return
        b.cardContainer.setOnTouchListener(object : View.OnTouchListener {
            private var initialTouchY = 0f
            private var initialY = 0

            override fun onTouch(v: View, event: MotionEvent): Boolean {
                val p = params ?: return false
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialTouchY = event.rawY
                        initialY = p.y
                        return true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        val deltaY = event.rawY - initialTouchY
                        p.y = initialY + deltaY.toInt()

                        if (deltaY < 0) {
                            b.cardContainer.alpha = (1f + deltaY / 800f).coerceIn(0.2f, 1f)
                        }

                        try { windowManager.updateViewLayout(b.root, p) } catch (e: Exception) {}
                        return true
                    }
                    MotionEvent.ACTION_UP -> {
                        val deltaY = event.rawY - initialTouchY
                        if (deltaY < -200) {
                            dismissWithAnimation()
                        } else {
                            // Snap back with animation
                            val animator = android.animation.ValueAnimator.ofInt(p.y, 120)
                            animator.duration = 300
                            animator.interpolator = android.view.animation.OvershootInterpolator()
                            animator.addUpdateListener { 
                                p.y = it.animatedValue as Int
                                try { windowManager.updateViewLayout(b.root, p) } catch (e: Exception) {}
                            }
                            animator.start()
                            b.cardContainer.animate().alpha(1f).setDuration(200).start()
                        }
                        return true
                    }
                }
                return false
            }
        })
    }

    private fun dismissWithAnimation() {
        if (!isShowing) return
        isShowing = false
        binding?.cardContainer?.animate()
            ?.alpha(0f)
            ?.translationY(-300f)
            ?.scaleX(0.9f)
            ?.scaleY(0.9f)
            ?.setDuration(350)
            ?.setInterpolator(android.view.animation.AccelerateInterpolator())
            ?.setListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    stopSelf()
                }
            })
            ?.start() ?: stopSelf()
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
        val b = binding ?: return
        val selectedChips = getSelectedContacts()
        if (selectedChips.isEmpty()) {
            b.tvSplitSummary.text = "Select contacts to see split details"
            b.layoutOverlayUpiSetup.visibility = View.GONE
            b.layoutOverlayQrContainer.visibility = View.GONE
            return
        }

        val totalPeople = selectedChips.size + 1
        val splitAmount = totalAmount / totalPeople
        val formattedSplit = "₹%,.2f".format(splitAmount)
        b.tvSplitSummary.text = "Split equally: $totalPeople people. Your share: $formattedSplit. Others owe: $formattedSplit each."

        val upiId = loadUpiIdFromStorage()
        if (upiId.isNullOrBlank()) {
            b.layoutOverlayUpiSetup.visibility = View.VISIBLE
            b.layoutOverlayQrContainer.visibility = View.GONE
        } else {
            b.layoutOverlayUpiSetup.visibility = View.GONE
            b.layoutOverlayQrContainer.visibility = View.VISIBLE

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
                b.ivOverlayQr.setImageBitmap(qrBitmap)
                b.tvOverlayQrDetails.text = "Scan to pay ₹${"%.2f".format(splitAmount)} to $upiId"
            }
        }
    }

    private fun getSelectedContacts(): List<Pair<String, String>> {
        val b = binding ?: return emptyList()
        val list = mutableListOf<Pair<String, String>>()
        try {
            for (i in 0 until b.chipGroupSplitContacts.childCount) {
                val chip = b.chipGroupSplitContacts.getChildAt(i) as? Chip
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

    private fun playSuccessAnimationAndDismiss() {
        val b = binding ?: return
        b.etOverlayNotes.clearFocus()
        b.etOverlayUpiId.clearFocus()
        b.layoutSuccessAnimation.visibility = View.VISIBLE
        b.layoutSuccessAnimation.alpha = 0f
        b.layoutSuccessAnimation.animate().alpha(1f).setDuration(200).start()

        b.ivSuccessTick.scaleX = 0f
        b.ivSuccessTick.scaleY = 0f
        b.ivSuccessTick.animate()
            .scaleX(1.1f).scaleY(1.1f).setDuration(400)
            .setInterpolator(android.view.animation.OvershootInterpolator(2.0f))
            .withEndAction {
                b.ivSuccessTick.animate().scaleX(1.0f).scaleY(1.0f).setDuration(150).start()
            }.start()

        b.viewBurstRing.scaleX = 0.1f
        b.viewBurstRing.scaleY = 0.1f
        b.viewBurstRing.alpha = 1f
        b.viewBurstRing.animate()
            .scaleX(4.0f).scaleY(4.0f).alpha(0f).setDuration(600)
            .setInterpolator(android.view.animation.DecelerateInterpolator()).start()

        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            dismissWithAnimation()
        }, 1200)
    }

    override fun onDestroy() {
        super.onDestroy()
        binding?.let {
            try { windowManager.removeView(it.root) } catch (e: Exception) {}
        }
        binding = null
        isShowing = false
    }
}
