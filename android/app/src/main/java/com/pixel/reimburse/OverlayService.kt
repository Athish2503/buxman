package com.pixel.reimburse

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.*
import android.view.WindowManager.LayoutParams
import android.widget.TextView
import androidx.core.view.children
import androidx.appcompat.view.ContextThemeWrapper
import com.google.android.material.chip.Chip
import com.pixel.reimburse.databinding.LayoutOverlayPopupBinding
import java.util.*
import kotlin.math.abs

class OverlayService : Service() {
    private lateinit var windowManager: WindowManager
    private var binding: LayoutOverlayPopupBinding? = null
    private var params: LayoutParams? = null

    companion object {
        var categories: List<String> = listOf("Meals", "Travel", "Shopping", "Health", "Other")
        private var selectedCategory: String? = null
        
        fun updateCategories(list: List<String>) {
            categories = list
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val amount = intent?.getDoubleExtra("amount", 0.0) ?: 0.0
        val merchant = intent?.getStringExtra("merchant") ?: "Unknown"
        val appName = intent?.getStringExtra("appName") ?: "Bank"

        if (binding == null) {
            showOverlay(amount, merchant, appName)
        } else {
            updateOverlay(amount, merchant, appName)
        }

        return START_NOT_STICKY
    }

    private fun showOverlay(amount: Double, merchant: String, appName: String) {
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        binding = LayoutOverlayPopupBinding.inflate(LayoutInflater.from(this))

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
            y = 100
        }

        setupUI(amount, merchant, appName)
        windowManager.addView(binding?.root, params)
        
        // Entrance Animation
        binding?.cardContainer?.alpha = 0f
        binding?.cardContainer?.translationY = -100f
        binding?.cardContainer?.animate()
            ?.alpha(1f)
            ?.translationY(0f)
            ?.setDuration(400)
            ?.setInterpolator(android.view.animation.OvershootInterpolator())
            ?.start()
    }

    private fun updateOverlay(amount: Double, merchant: String, appName: String) {
        setupUI(amount, merchant, appName)
    }

    private fun setupUI(amount: Double, merchant: String, appName: String) {
        val b = binding ?: return
        
        b.tvAmount.text = "₹${"%,.0f".format(amount)}"
        b.tvMerchant.text = merchant

        // Setup Chips
        b.chipGroupCategories.removeAllViews()
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
            b.chipGroupCategories.addView(chip)
        }

        b.btn_close.setOnClickListener { dismissWithAnimation() }
        b.btnDismiss.setOnClickListener { 
            FinancialNotificationPlugin.onOverlayAction("dismiss", amount, merchant)
            dismissWithAnimation() 
        }

        b.btnSave.setOnClickListener {
            val notes = b.etNotes.text.toString()
            FinancialNotificationPlugin.onOverlayAction("save", amount, merchant, selectedCategory, notes)
            dismissWithAnimation()
        }

        // Handle Keyboard Focus
        b.etNotes.setOnFocusChangeListener { _, hasFocus ->
            params?.let { p ->
                if (hasFocus) {
                    p.flags = p.flags and LayoutParams.FLAG_NOT_FOCUSABLE.inv()
                } else {
                    p.flags = p.flags or LayoutParams.FLAG_NOT_FOCUSABLE
                }
                windowManager.updateViewLayout(b.root, p)
            }
        }

        setupSwipeBehavior()
    }

    private fun setupSwipeBehavior() {
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
                        
                        // Apply slight alpha based on swipe up
                        if (deltaY < 0) {
                            b.cardContainer.alpha = (1f + deltaY / 500f).coerceIn(0f, 1f)
                        }
                        
                        windowManager.updateViewLayout(b.root, p)
                        return true
                    }
                    MotionEvent.ACTION_UP -> {
                        val deltaY = event.rawY - initialTouchY
                        if (deltaY < -200) {
                            dismissWithAnimation()
                        } else {
                            // Snap back
                            p.y = 100
                            b.cardContainer.animate().alpha(1f).setDuration(200).start()
                            windowManager.updateViewLayout(b.root, p)
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
            ?.translationY(-200f)
            ?.setDuration(300)
            ?.setListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    stopSelf()
                }
            })
            ?.start()
    }

    override fun onDestroy() {
        super.onDestroy()
        binding?.let {
            try {
                windowManager.removeView(it.root)
            } catch (e: Exception) {}
        }
    }
}

