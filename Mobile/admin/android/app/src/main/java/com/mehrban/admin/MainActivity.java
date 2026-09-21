package com.mehrban.admin;

import android.os.Bundle;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ensure app content fits within system windows and leaves notch & nav buttons free
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (view, windowInsets) -> {
            androidx.core.graphics.Insets insets = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            view.setPadding(insets.left, insets.top, insets.right, insets.bottom);
            return windowInsets;
        });
    }
}
