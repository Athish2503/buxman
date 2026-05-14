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

        fun updateCategories(list: List<String>) {
            categories = list
            Log.d(TAG, "Overlay categories updated: $list")
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val amount = intent?.getDoubleExtra("amount", 0.0) ?: 0.0
        val merchant = intent?.getStringExtra("merchant") ?: "Unknown Merchant"
        val appName = intent?.getStringExtra("appName") ?: "System"
        val rawText = intent?.getStringExtra("rawText") ?: ""
        val type = intent?.getStringExtra("type") ?: "debit"
        val account = intent?.getStringExtra("account") ?: ""

        Log.d(TAG, "Overlay triggered for: $merchant | Amount: $amount | App: $appName | Type: $type")

        if (!Settings.canDrawOverlays(this)) {
            Log.e(TAG, "Cannot show overlay: SYSTEM_ALERT_WINDOW permission missing.")
            stopSelf()
            return START_NOT_STICKY
        }

        if (binding == null) {
            showOverlay(amount, merchant, appName, rawText, type, account)
        } else {
            updateOverlay(amount, merchant, appName, type, account)
        }

        return START_NOT_STICKY
    }

    private fun showOverlay(amount: Double, merchant: String, appName: String, rawText: String, type: String, account: String) {
        val themedContext = ContextThemeWrapper(this, R.style.AppTheme)
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager

        try {
            binding = LayoutTransactionOverlayBinding.inflate(LayoutInflater.from(themedContext))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to inflate transaction overlay layout", e)
            stopSelf()
            return
        }

        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
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
            Log.e(TAG, "Failed adding overlay view to WindowManager", e)
            stopSelf()
            return
        }

        // Beautiful smooth entry animation
        binding?.cardContainer?.apply {
            alpha = 0f
            translationY = -120f
            animate()
                .alpha(1f)
                .translationY(0f)
                .setDuration(350)
                .setInterpolator(android.view.animation.OvershootInterpolator())
                .start()
        }
    }

    private fun updateOverlay(amount: Double, merchant: String, appName: String, type: String, account: String) {
        setupUI(amount, merchant, appName, type, account)
    }

    private fun setupUI(amount: Double, merchant: String, appName: String, type: String, account: String) {
        val b = binding ?: return
        selectedCategory = null

        val isCredit = type == "credit"
        val accentColor = if (isCredit) 0xFF10B981.toInt() else 0xFFEF4444.toInt() // Emerald-500 vs Red-500

        b.tvOverlayAmount.text = "₹${"%,.0f".format(amount)}"
        b.tvOverlayAmount.setTextColor(accentColor)
        
        b.tvOverlayMerchant.text = if (account.isNotBlank()) "$merchant • $account" else merchant
        b.tvSourceApp.text = if (isCredit) "INCOME DETECTED" else "EXPENSE DETECTED"
        b.tvSourceApp.setTextColor(accentColor)
        
        // Update Icon Tint
        val headerIcon = (b.tvSourceApp.parent as android.view.ViewGroup).getChildAt(0) as? android.widget.ImageView
        headerIcon?.setColorFilter(accentColor)

        b.btnOverlaySave.backgroundTintList = android.content.res.ColorStateList.valueOf(accentColor)
        b.btnOverlaySave.text = if (isCredit) "Save Income" else "Save Expense"

        // Populate dynamic category chips
        b.chipGroupOverlayCategories.removeAllViews()
        val currentCategories = if (isCredit) listOf("Salary", "Refund", "Cash Deposit", "Gift", "Other") else categories
        
        currentCategories.forEach { category ->
            val themedContext = ContextThemeWrapper(this, R.style.AppTheme)
            val chip = Chip(themedContext, null, com.google.android.material.R.attr.chipStyle)
            chip.text = category
            chip.isCheckable = true
            chip.setTextColor(0xFFFFFFFF.toInt())
            chip.chipBackgroundColor = android.content.res.ColorStateList.valueOf(0x00000000)
            chip.chipStrokeColor = android.content.res.ColorStateList.valueOf(0x44FFFFFF)
            chip.chipStrokeWidth = 1f

            chip.setOnCheckedChangeListener { _, isChecked ->
                if (isChecked) {
                    selectedCategory = category
                    chip.chipBackgroundColor = android.content.res.ColorStateList.valueOf(accentColor)
                    chip.setTextColor(0xFFFFFFFF.toInt())
                    chip.chipStrokeWidth = 0f
                } else {
                    if (selectedCategory == category) selectedCategory = null
                    chip.chipBackgroundColor = android.content.res.ColorStateList.valueOf(0x00000000)
                    chip.setTextColor(0xFFFFFFFF.toInt())
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

            Log.d(TAG, "Save request initiated for $merchant, amount: $amount, type: $type")
            val success = persistTransactionNatively(amount, merchant, category, notes, type)
            
            if (success) {
                FinancialNotificationPlugin.onOverlayAction(this, "save", amount, merchant, category, notes, true)
                playSuccessAnimationAndDismiss()
            } else {
                b.btnOverlaySave.isEnabled = true
                b.btnOverlaySave.text = "✖ Save Failed - Tap Retry"
                b.btnOverlaySave.backgroundTintList = android.content.res.ColorStateList.valueOf(0xFFEF4444.toInt())
            }
        }

        b.etOverlayNotes.setOnFocusChangeListener { _, hasFocus ->
            params?.let { p ->
                if (hasFocus) {
                    p.flags = p.flags and LayoutParams.FLAG_NOT_FOCUSABLE.inv()
                } else {
                    p.flags = p.flags or LayoutParams.FLAG_NOT_FOCUSABLE
                }
                try {
                    windowManager.updateViewLayout(b.root, p)
                } catch (e: Exception) {
                    Log.e(TAG, "Error updating window layout flags", e)
                }
            }
        }

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
                            b.cardContainer.alpha = (1f + deltaY / 600f).coerceIn(0f, 1f)
                        }

                        try {
                            windowManager.updateViewLayout(b.root, p)
                        } catch (e: Exception) {}
                        return true
                    }
                    MotionEvent.ACTION_UP -> {
                        val deltaY = event.rawY - initialTouchY
                        if (deltaY < -150) {
                            dismissWithAnimation()
                        } else {
                            p.y = 120
                            b.cardContainer.animate().alpha(1f).setDuration(200).start()
                            try {
                                windowManager.updateViewLayout(b.root, p)
                            } catch (e: Exception) {}
                        }
                        return true
                    }
                }
                return false
            }
        })
    }

    private fun dismissWithAnimation() {
        binding?.cardContainer?.animate()
            ?.alpha(0f)
            ?.translationY(-150f)
            ?.setDuration(250)
            ?.setListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    stopSelf()
                }
            })
            ?.start() ?: stopSelf()
    }

    private fun persistTransactionNatively(amount: Double, merchant: String, category: String, notes: String, type: String): Boolean {
        try {
            val prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val storageKey = "reimburse_expenses_v2"
            val existingJsonStr = prefs.getString(storageKey, "[]") ?: "[]"
            
            val jsonArray = try {
                org.json.JSONArray(existingJsonStr)
            } catch (e: Exception) {
                org.json.JSONArray()
            }

            val now = System.currentTimeMillis()
            val dateStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date(now))
            val isoTimeStr = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }.format(java.util.Date(now))

            val newExpense = org.json.JSONObject().apply {
                put("id", "TXN_" + java.util.UUID.randomUUID().toString().substring(0, 8))
                put("date", dateStr)
                put("vendor", merchant)
                put("category", category)
                put("amount", amount)
                put("currency", "INR")
                put("description", notes.takeIf { it.isNotBlank() } ?: "Captured via Smart Overlay")
                put("status", "approved")
                put("type", type)
                put("isReimbursement", false)
                put("createdAt", isoTimeStr)
                put("updatedAt", isoTimeStr)
            }

            val updatedArray = org.json.JSONArray()
            updatedArray.put(newExpense)
            for (i in 0 until jsonArray.length()) {
                updatedArray.put(jsonArray.getJSONObject(i))
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
        b.layoutSuccessAnimation.visibility = View.VISIBLE
        b.layoutSuccessAnimation.alpha = 0f
        b.layoutSuccessAnimation.animate().alpha(1f).setDuration(150).start()

        b.ivSuccessTick.scaleX = 0f
        b.ivSuccessTick.scaleY = 0f
        b.ivSuccessTick.animate()
            .scaleX(1.1f).scaleY(1.1f).setDuration(350)
            .setInterpolator(android.view.animation.OvershootInterpolator(1.5f))
            .withEndAction {
                b.ivSuccessTick.animate().scaleX(1.0f).scaleY(1.0f).setDuration(100).start()
            }.start()

        b.viewBurstRing.scaleX = 0.2f
        b.viewBurstRing.scaleY = 0.2f
        b.viewBurstRing.alpha = 0.8f
        b.viewBurstRing.animate()
            .scaleX(3.0f).scaleY(3.0f).alpha(0f).setDuration(550)
            .setInterpolator(android.view.animation.DecelerateInterpolator()).start()

        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            dismissWithAnimation()
        }, 1100)
    }

    override fun onDestroy() {
        super.onDestroy()
        binding?.let {
            try { windowManager.removeView(it.root) } catch (e: Exception) {}
        }
        binding = null
    }
}
