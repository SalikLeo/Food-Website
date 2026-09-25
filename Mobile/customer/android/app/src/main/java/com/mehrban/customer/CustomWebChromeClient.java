package com.mehrban.customer;

import android.app.Dialog;
import android.os.Message;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;

public class CustomWebChromeClient extends BridgeWebChromeClient {
    private final MainActivity activity;
    private final String cleanUserAgent;

    public CustomWebChromeClient(Bridge bridge, MainActivity activity, String cleanUserAgent) {
        super(bridge);
        this.activity = activity;
        this.cleanUserAgent = cleanUserAgent;
    }

    @Override
    public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
        WebView popupWebView = new WebView(activity);
        WebSettings popupSettings = popupWebView.getSettings();
        popupSettings.setJavaScriptEnabled(true);
        popupSettings.setDomStorageEnabled(true);
        popupSettings.setSupportMultipleWindows(true);
        popupSettings.setJavaScriptCanOpenWindowsAutomatically(true);
        if (cleanUserAgent != null) {
            popupSettings.setUserAgentString(cleanUserAgent);
        }

        Dialog dialog = new Dialog(activity, android.R.style.Theme_DeviceDefault_Light_NoActionBar_Fullscreen);
        dialog.setContentView(popupWebView);
        dialog.show();

        popupWebView.setWebChromeClient(new BridgeWebChromeClient(activity.getBridge()) {
            @Override
            public void onCloseWindow(WebView window) {
                if (dialog.isShowing()) {
                    dialog.dismiss();
                }
                popupWebView.destroy();
            }
        });

        popupWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }
        });

        WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
        transport.setWebView(popupWebView);
        resultMsg.sendToTarget();
        return true;
    }
}
