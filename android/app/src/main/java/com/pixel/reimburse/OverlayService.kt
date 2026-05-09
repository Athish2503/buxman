package com.pixel.reimburse

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.*
import android.view.WindowManager.LayoutParams
import android.widget.ArrayAdapter
import com.pixel.reimburse.databinding.LayoutOverlayPopupBinding

class OverlayService : Service() {
    private lateinit var windowManager: WindowManager
    private var binding: LayoutOverlayPopupBinding? = null
    private var params: LayoutParams? = null

    companion object {
        var categories: List<String> = listOf("Meals", "Travel", "Shopping", "Health", "Other")
        
        fun updateCategories(list: List<String>) {
            categories = list
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val amount = intent?.getDoubleExtra("amount", 0.0) ?: 0.0
        val merchant = intent?.getStringExtra("merchant") ?: "Unknown"
        val appName = intent?.getStringExtra("appName") ?: "GPay"

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
    }

    private fun updateOverlay(amount: Double, merchant: String, appName: String) {
        setupUI(amount, merchant, appName)
    }

    private fun setupUI(amount: Double, merchant: String, appName: String) {
        val b = binding ?: return
        
        // App-specific coloring
        when {
            appName.contains("GPay", true) -> b.headerLayout.setBackgroundColor(0xFF1A73E8.toInt())
            appName.contains("PhonePe", true) -> b.headerLayout.setBackgroundColor(0xFF5F259F.toInt())
            appName.contains("Paytm", true) -> b.headerLayout.setBackgroundColor(0xFF00B9F1.toInt())
            appName.contains("Amazon", true) -> b.headerLayout.setBackgroundColor(0xFFFF9900.toInt())
            appName.contains("SBI", true) -> b.headerLayout.setBackgroundColor(0xFF285BA3.toInt())
            else -> b.headerLayout.setBackgroundColor(0xFF7C3AED.toInt())
        }

        b.tvAmount.text = "₹%.2f".format(amount)
        b.tvMerchant.text = merchant

        val adapter = ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, categories)
        b.autoCompleteCategory.setAdapter(adapter)

        b.btnDismiss.setOnClickListener {
            FinancialNotificationPlugin.onOverlayAction("dismiss", amount, merchant)
            stopSelf()
        }

        b.btnSave.setOnClickListener {
            val category = b.autoCompleteCategory.text.toString()
            val notes = b.etNotes.text.toString()
            FinancialNotificationPlugin.onOverlayAction("save", amount, merchant, category, notes)
            stopSelf()
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

        setupDragBehavior()
    }

    private fun setupDragBehavior() {
        val b = binding ?: return
        b.cardContainer.setOnTouchListener(object : View.OnTouchListener {
            private var initialX = 0
            private var initialY = 0
            private var initialTouchX = 0f
            private var initialTouchY = 0f

            override fun onTouch(v: View, event: MotionEvent): Boolean {
                val p = params ?: return false
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = p.x
                        initialY = p.y
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        return true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        p.x = initialX + (event.rawX - initialTouchX).toInt()
                        p.y = initialY + (event.rawY - initialTouchY).toInt()
                        
                        val displayMetrics = resources.displayMetrics
                        p.x = p.x.coerceIn(-displayMetrics.widthPixels/2, displayMetrics.widthPixels/2)
                        p.y = p.y.coerceIn(-displayMetrics.heightPixels/2, displayMetrics.heightPixels/2)
                        
                        windowManager.updateViewLayout(b.root, p)
                        return true
                    }
                }
                return false
            }
        })
    }

    override fun onDestroy() {
        super.onDestroy()
        binding?.let {
            windowManager.removeView(it.root)
        }
    }
}
