package com.pixel.reimburse

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Base64
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import com.getcapacitor.BridgeActivity
import java.io.BufferedReader
import java.io.InputStreamReader

class MainActivity : BridgeActivity() {
    private var pendingTransaction: String? = null
    private var transactionReceiver: BroadcastReceiver? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Improved WebChromeClient for handling permissions specifically
        bridge.webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    val resources = request.resources
                    for (resource in resources) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE == resource) {
                            if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                                request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                            } else {
                                requestPermissions(arrayOf(android.Manifest.permission.RECORD_AUDIO), 102)
                                request.deny()
                            }
                        } else if (PermissionRequest.RESOURCE_VIDEO_CAPTURE == resource) {
                            if (checkSelfPermission(android.Manifest.permission.CAMERA) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                                request.grant(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))
                            } else {
                                request.deny()
                            }
                        }
                    }
                }
            }
        }

        transactionReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if ("com.pixel.reimburse.TRANSACTION_DETECTED" == intent.action) {
                    val body = intent.getStringExtra("body")
                    dispatchTransaction(body)
                }
            }
        }

        val filter = IntentFilter("com.pixel.reimburse.TRANSACTION_DETECTED")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(transactionReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(transactionReceiver, filter)
        }
        
        // Add JS Interface for legacy native calls
        bridge.webView.addJavascriptInterface(NativeBridge(), "NativeBridge")

        // Check if we were started with transaction data
        handleIntent(intent)
    }

    inner class NativeBridge {
        @JavascriptInterface
        fun openNotificationSettings() {
            val intent = Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")
            startActivity(intent)
        }

        @JavascriptInterface
        fun openOverlaySettings() {
            val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName"))
            startActivity(intent)
        }

        @JavascriptInterface
        fun requestSMSPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                requestPermissions(arrayOf(
                    android.Manifest.permission.RECEIVE_SMS, 
                    android.Manifest.permission.READ_SMS
                ), 101)
            }
        }

        @JavascriptInterface
        fun checkSMSPermission(): Boolean {
            return Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
                (checkSelfPermission(android.Manifest.permission.RECEIVE_SMS) == android.content.pm.PackageManager.PERMISSION_GRANTED &&
                 checkSelfPermission(android.Manifest.permission.READ_SMS) == android.content.pm.PackageManager.PERMISSION_GRANTED)
        }

        @JavascriptInterface
        fun requestMicrophonePermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                requestPermissions(arrayOf(android.Manifest.permission.RECORD_AUDIO), 102)
            }
        }

        @JavascriptInterface
        fun checkMicrophonePermission(): Boolean {
            return Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
                checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) == android.content.pm.PackageManager.PERMISSION_GRANTED
        }

        @JavascriptInterface
        fun checkNotificationPermission(): Boolean {
            val enabledListeners = Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
            return enabledListeners != null && enabledListeners.contains(packageName)
        }

        @JavascriptInterface
        fun checkOverlayPermission(): Boolean {
            return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this@MainActivity)
        }

        @JavascriptInterface
        fun pickFile() {
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "*/*"
                putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("application/json", "text/csv", "text/comma-separated-values"))
            }
            startActivityForResult(intent, 103)
        }

        @JavascriptInterface
        fun getPendingTransaction(): String? {
            val temp = pendingTransaction
            pendingTransaction = null // Clear after read
            return temp
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 103 && resultCode == RESULT_OK && data != null) {
            val uri = data.data
            if (uri != null) {
                try {
                    val inputStream = contentResolver.openInputStream(uri)
                    val reader = BufferedReader(InputStreamReader(inputStream))
                    val stringBuilder = StringBuilder()
                    var line: String?
                    while (reader.readLine().also { line = it } != null) {
                        stringBuilder.append(line).append("\n")
                    }
                    inputStream?.close()
                    val content = stringBuilder.toString()
                    
                    // Send content back to JS
                    bridge.webView.post {
                        val encoded = Base64.encodeToString(content.toByteArray(), Base64.NO_WRAP)
                        bridge.webView.evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('file-picked', { detail: { content: atob('$encoded') } }));",
                            null
                        )
                    }
                } catch (e: Exception) {
                    Log.e("MainActivity", "File read error", e)
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        if (intent != null && intent.hasExtra("body")) {
            val body = intent.getStringExtra("body")
            pendingTransaction = body
            dispatchTransaction(body)
        }
    }

    private fun dispatchTransaction(body: String?) {
        if (body == null || bridge == null || bridge.webView == null) return
        
        bridge.webView.post {
            val encodedBody = Base64.encodeToString(body.toByteArray(), Base64.NO_WRAP)
            bridge.webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('notification-transaction', { detail: { body: atob('$encodedBody') } }));",
                null
            )
        }
    }

    override fun onPause() {
        super.onPause()
        bridge.webView.onPause()
        bridge.webView.pauseTimers()
    }

    override fun onResume() {
        super.onResume()
        bridge.webView.onResume()
        bridge.webView.resumeTimers()
    }

    override fun onDestroy() {
        super.onDestroy()
        transactionReceiver?.let {
            unregisterReceiver(it)
        }
        bridge.webView.destroy()
    }
}
