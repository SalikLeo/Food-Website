package com.mehrban.admin;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(ReceiptBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}

