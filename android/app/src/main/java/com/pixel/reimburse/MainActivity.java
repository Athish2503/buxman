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
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private BroadcastReceiver transactionReceiver;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Standard Capacitor bridge already handles some permissions, 
        // but for Voice/Mic in WebView, we sometimes need a manual boost:
        bridge.getWebView().setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                MainActivity.this.runOnUiThread(() -> {
                    request.grant(request.getResources());
                });
            }
        });

        transactionReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("com.pixel.reimburse.TRANSACTION_DETECTED".equals(intent.getAction())) {
                    String body = intent.getStringExtra("body");
                    bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('notification-transaction', { detail: { body: '" + 
                        body.replace("'", "\\'") + "' } }));",
                        null
                    ));
                }
            }
        };

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(transactionReceiver, new IntentFilter("com.pixel.reimburse.TRANSACTION_DETECTED"), Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(transactionReceiver, new IntentFilter("com.pixel.reimburse.TRANSACTION_DETECTED"));
        }
        
        // Add JS Interface for native calls
        bridge.getWebView().addJavascriptInterface(new Object() {
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
        }, "NativeBridge");

        // Check if we were started with transaction data
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent != null && intent.hasExtra("body")) {
            String body = intent.getStringExtra("body");
            bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('notification-transaction', { detail: { body: '" + 
                body.replace("'", "\\'") + "' } }));",
                null
            ));
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (transactionReceiver != null) {
            unregisterReceiver(transactionReceiver);
        }
    }
}
