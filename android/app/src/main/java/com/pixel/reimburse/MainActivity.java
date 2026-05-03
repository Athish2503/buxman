package com.pixel.reimburse;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private String pendingTransaction = null;
    private BroadcastReceiver transactionReceiver;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Improved WebChromeClient for handling permissions specifically
        bridge.getWebView().setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                MainActivity.this.runOnUiThread(() -> {
                    String[] resources = request.getResources();
                    for (String resource : resources) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                            // Check if app has system permission before granting to WebView
                            if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                                request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                            } else {
                                // Request system permission if not granted
                                requestPermissions(new String[]{android.Manifest.permission.RECORD_AUDIO}, 102);
                                // The WebView request will likely timeout/fail, but the user will get the system prompt
                                request.deny();
                            }
                        } else if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                            if (checkSelfPermission(android.Manifest.permission.CAMERA) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                                request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                            } else {
                                request.deny();
                            }
                        }
                    }
                });
            }
        });

        transactionReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("com.pixel.reimburse.TRANSACTION_DETECTED".equals(intent.getAction())) {
                    String body = intent.getStringExtra("body");
                    dispatchTransaction(body);
                }
            }
        };

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(transactionReceiver, new IntentFilter("com.pixel.reimburse.TRANSACTION_DETECTED"), Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(transactionReceiver, new IntentFilter("com.pixel.reimburse.TRANSACTION_DETECTED"));
        }
        
        // Add JS Interface for native calls
        bridge.getWebView().addJavascriptInterface(new NativeBridge(), "NativeBridge");

        // Check if we were started with transaction data
        handleIntent(getIntent());
    }

    public class NativeBridge {
        @JavascriptInterface
        public void openNotificationSettings() {
            Intent intent = new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
            startActivity(intent);
        }

        @JavascriptInterface
        public void openOverlaySettings() {
            Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    android.net.Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        }

        @JavascriptInterface
        public void requestSMSPermission() {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                requestPermissions(new String[]{
                    android.Manifest.permission.RECEIVE_SMS, 
                    android.Manifest.permission.READ_SMS
                }, 101);
            }
        }

        @JavascriptInterface
        public boolean checkSMSPermission() {
            return android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.M ||
                (checkSelfPermission(android.Manifest.permission.RECEIVE_SMS) == android.content.pm.PackageManager.PERMISSION_GRANTED &&
                 checkSelfPermission(android.Manifest.permission.READ_SMS) == android.content.pm.PackageManager.PERMISSION_GRANTED);
        }

        @JavascriptInterface
        public void requestMicrophonePermission() {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                requestPermissions(new String[]{android.Manifest.permission.RECORD_AUDIO}, 102);
            }
        }

        @JavascriptInterface
        public boolean checkMicrophonePermission() {
            return android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.M ||
                checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        }

        @JavascriptInterface
        public boolean checkNotificationPermission() {
            String packageName = getPackageName();
            String enabledListeners = android.provider.Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
            return enabledListeners != null && enabledListeners.contains(packageName);
        }

        @JavascriptInterface
        public boolean checkOverlayPermission() {
            return android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.M || 
                android.provider.Settings.canDrawOverlays(MainActivity.this);
        }

        @JavascriptInterface
        public void pickFile() {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/json");
            startActivityForResult(intent, 103);
        }

        @JavascriptInterface
        public String getPendingTransaction() {
            String temp = pendingTransaction;
            pendingTransaction = null; // Clear after read
            return temp;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 103 && resultCode == RESULT_OK && data != null) {
            android.net.Uri uri = data.getData();
            if (uri != null) {
                try {
                    java.io.InputStream inputStream = getContentResolver().openInputStream(uri);
                    java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(inputStream));
                    StringBuilder stringBuilder = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        stringBuilder.append(line);
                    }
                    inputStream.close();
                    final String content = stringBuilder.toString();
                    
                    // Send content back to JS
                    bridge.getWebView().post(() -> {
                        String encoded = "";
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                            encoded = java.util.Base64.getEncoder().encodeToString(content.getBytes());
                        } else {
                            encoded = android.util.Base64.encodeToString(content.getBytes(), android.util.Base64.NO_WRAP);
                        }
                        final String finalEncoded = encoded;
                        bridge.getWebView().evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('file-picked', { detail: { content: atob('" + finalEncoded + "') } }));",
                            null
                        );
                    });
                } catch (Exception e) {
                    Log.e("MainActivity", "File read error", e);
                }
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent != null && intent.hasExtra("body")) {
            String body = intent.getStringExtra("body");
            pendingTransaction = body;
            dispatchTransaction(body);
        }
    }

    private void dispatchTransaction(String body) {
        if (body == null || bridge == null || bridge.getWebView() == null) return;
        
        // Encode body to Base64 to avoid issues with special characters in JS
        String encodedBody = "";
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            encodedBody = java.util.Base64.getEncoder().encodeToString(body.getBytes());
        } else {
            encodedBody = android.util.Base64.encodeToString(body.getBytes(), android.util.Base64.NO_WRAP);
        }

        final String finalEncoded = encodedBody;
        bridge.getWebView().post(() -> {
            if (bridge.getWebView() != null) {
                bridge.getWebView().evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('notification-transaction', { detail: { body: atob('" + finalEncoded + "') } }));",
                    null
                );
            }
        });
    }


    @Override
    public void onPause() {
        super.onPause();
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().onPause();
            bridge.getWebView().pauseTimers();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().onResume();
            bridge.getWebView().resumeTimers();
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (transactionReceiver != null) {
            unregisterReceiver(transactionReceiver);
        }
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().destroy();
        }
    }

}
