package com.mehrban.customer;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String PREFS_NAME = "salik_theme_prefs";
    private static final String KEY_IS_DARK = "is_dark";
    private static final String DARK_COLOR_HEX = "#0e0e11";
    private static final String LIGHT_COLOR_HEX = "#ffffff";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        registerPlugin(ReceiptBridgePlugin.class);
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            String ua = settings.getUserAgentString();
            String cleanUa = ua != null ? ua.replace("; wv", "").replaceAll("Version/\\d+\\.\\d+\\s?", "") : null;
            if (cleanUa != null) {
                settings.setUserAgentString(cleanUa);
            }
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setDomStorageEnabled(true);
        }

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        View rootView = findViewById(android.R.id.content);
        if (rootView != null) {
            boolean isDark = isCurrentThemeDark();
            rootView.setBackgroundColor(isDark ? Color.parseColor(DARK_COLOR_HEX) : Color.parseColor(LIGHT_COLOR_HEX));
            ViewCompat.setOnApplyWindowInsetsListener(rootView, (view, windowInsets) -> {
                Insets insets = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
                );
                view.setPadding(insets.left, insets.top, insets.right, insets.bottom);
                return windowInsets;
            });
            rootView.requestApplyInsets();
        }

        applyCurrentSystemBarsTheme();
        getWindow().getDecorView().post(this::applyCurrentSystemBarsTheme);
    }

    @Override
    public void onResume() {
        super.onResume();
        applyCurrentSystemBarsTheme();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyCurrentSystemBarsTheme();
        }
    }

    public void setPersistedTheme(boolean isDark) {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putBoolean(KEY_IS_DARK, isDark).apply();
        } catch (Exception ignored) {}
    }

    public boolean isCurrentThemeDark() {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            if (prefs.contains(KEY_IS_DARK)) {
                return prefs.getBoolean(KEY_IS_DARK, false);
            }
        } catch (Exception ignored) {}

        int nightModeFlags = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return nightModeFlags == Configuration.UI_MODE_NIGHT_YES;
    }

    public void applyCurrentSystemBarsTheme() {
        boolean isDark = isCurrentThemeDark();
        applySystemBars(isDark, isDark ? DARK_COLOR_HEX : LIGHT_COLOR_HEX, isDark ? DARK_COLOR_HEX : LIGHT_COLOR_HEX);
    }

    public void applySystemBars(boolean isDark, String sbHex, String nbHex) {
        try {
            Window window = getWindow();
            int sbColor = Color.parseColor(sbHex != null && !sbHex.isEmpty() ? sbHex : (isDark ? DARK_COLOR_HEX : LIGHT_COLOR_HEX));
            int nbColor = Color.parseColor(nbHex != null && !nbHex.isEmpty() ? nbHex : (isDark ? DARK_COLOR_HEX : LIGHT_COLOR_HEX));

            window.setStatusBarColor(sbColor);
            window.setNavigationBarColor(nbColor);

            View rootView = findViewById(android.R.id.content);
            if (rootView != null) {
                rootView.setBackgroundColor(sbColor);
            }

            WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, window.getDecorView());
            if (insetsController != null) {
                insetsController.setAppearanceLightStatusBars(!isDark);
                insetsController.setAppearanceLightNavigationBars(!isDark);
            }
        } catch (Exception ignored) {}
    }
}
