package com.vlocker.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Edge-to-edge must be set before super.onCreate()
        requestEdgeToEdgeEnforcement();
        super.onCreate(savedInstanceState);
        setupEdgeToEdge();
    }

    /**
     * Opt into edge-to-edge enforcement for Android 15+ (API 35).
     * This replaces the deprecated {@code enableEdgeToEdge()} approach
     * and ensures the app renders behind system bars.
     */
    private void requestEdgeToEdgeEnforcement() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            // API 34+ — explicitly request edge-to-edge before Window is created
            Window window = getWindow();
            if (window != null) {
                WindowCompat.setDecorFitsSystemWindows(window, false);
            }
        }
    }

    /**
     * Configure the window for edge-to-edge drawing:
     * - Status bar and navigation bar are transparent
     * - WebView receives WindowInsets so it can apply safe-area padding
     * - System bar icons contrast against dark content
     */
    private void setupEdgeToEdge() {
        Window window = getWindow();
        if (window == null) return;

        // Allow content to draw behind system bars
        WindowCompat.setDecorFitsSystemWindows(window, false);

        // Transparent status and navigation bars
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.setStatusBarColor(Color.TRANSPARENT);
            window.setNavigationBarColor(Color.TRANSPARENT);
        }

        // Ensure the root view applies window insets for safe-area handling
        final View rootView = findViewById(android.R.id.content);
        if (rootView == null) return;

        ViewCompat.setOnApplyWindowInsetsListener(rootView, (view, insets) -> {
            // Let the web view handle insets via CSS env(safe-area-inset-*)
            // We return the insets unconsumed so the WebView receives them
            return insets;
        });

        // Light system bar icons (for dark app background #050A12)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            int flags = window.getDecorView().getSystemUiVisibility();
            // Clear LIGHT_STATUS_BAR flag => white icons on dark background
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            window.getDecorView().setSystemUiVisibility(flags);
        }
    }
}
