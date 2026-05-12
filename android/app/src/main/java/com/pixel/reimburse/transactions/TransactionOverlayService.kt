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

        Log.d(TAG, "Overlay triggered for: $merchant | Amount: $amount | App: $appName")

        if (!Settings.canDrawOverlays(this)) {
            Log.e(TAG, "Cannot show overlay: SYSTEM_ALERT_WINDOW permission missing.")
            stopSelf()
            return START_NOT_STICKY
        }

        if (binding == null) {
            showOverlay(amount, merchant, appName, rawText)
        } else {
            updateOverlay(amount, merchant, appName)
        }

        return START_NOT_STICKY
    }

    private fun showOverlay(amount: Double, merchant: String, appName: String, rawText: String) {
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

        setupUI(amount, merchant, appName)

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

    private fun updateOverlay(amount: Double, merchant: String, appName: String) {
        setupUI(amount, merchant, appName)
    }

    private fun setupUI(amount: Double, merchant: String, appName: String) {
        val b = binding ?: return

        b.tvOverlayAmount.text = "₹${"%,.0f".format(amount)}"
        b.tvOverlayMerchant.text = merchant
        b.tvSourceApp.text = "BUXMAN DETECTED • ${appName.uppercase()}"

        // Populate dynamic category chips
        b.chipGroupOverlayCategories.removeAllViews()
        categories.forEach { category ->
            val chip = Chip(ContextThemeWrapper(this, com.google.android.material.R.style.Widget_MaterialComponents_Chip_Choice))
            chip.text = category
            chip.isCheckable = true
            chip.setTextColor(0xFFFFFFFF.toInt())
            chip.setChipBackgroundColorResource(android.R.color.transparent)
            chip.setChipStrokeColorResource(android.R.color.white)
            chip.chipStrokeWidth = 1f

            chip.setOnCheckedChangeListener { _, isChecked ->
                if (isChecked) {
                    selectedCategory = category
                    chip.setChipBackgroundColorResource(android.R.color.white)
                    chip.setTextColor(0xFF000000.toInt())
                } else {
                    chip.setChipBackgroundColorResource(android.R.color.transparent)
                    chip.setTextColor(0xFFFFFFFF.toInt())
                }
            }
            b.chipGroupOverlayCategories.addView(chip)
        }

        b.btnCloseOverlay.setOnClickListener { dismissWithAnimation() }
        b.btnOverlayDismiss.setOnClickListener {
            FinancialNotificationPlugin.onOverlayAction("dismiss", amount, merchant)
            dismissWithAnimation()
        }

        b.btnOverlaySave.setOnClickListener {
            val notes = b.etOverlayNotes.text.toString()
            FinancialNotificationPlugin.onOverlayAction("save", amount, merchant, selectedCategory, notes)
            dismissWithAnimation()
        }

        // Adjust window flags when keyboard opens so input fields capture typing events seamlessly
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

    override fun onDestroy() {
        super.onDestroy()
        binding?.let {
            try {
                windowManager.removeView(it.root)
            } catch (e: Exception) {}
        }
        binding = null
    }
}
