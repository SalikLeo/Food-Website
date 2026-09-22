package com.mehrban.admin;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "ReceiptBridge")
public class ReceiptBridgePlugin extends Plugin {

    @PluginMethod
    public void saveImageToPhone(PluginCall call) {
        String base64Data = call.getString("base64");
        String fileName = call.getString("fileName");
        if (fileName == null || fileName.trim().isEmpty()) {
            fileName = "Receipt-" + System.currentTimeMillis() + ".png";
        }
        if (!fileName.toLowerCase().endsWith(".png")) {
            fileName = fileName + ".png";
        }

        if (base64Data == null || base64Data.trim().isEmpty()) {
            call.reject("Image data is missing");
            return;
        }

        try {
            if (base64Data.contains(",")) {
                base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
            }
            byte[] imageBytes = Base64.decode(base64Data, Base64.DEFAULT);
            Context context = getContext();

            boolean saved = false;
            String savedPath = "";

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = context.getContentResolver();
                ContentValues contentValues = new ContentValues();
                contentValues.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
                contentValues.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                contentValues.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/SalikFastFood");
                contentValues.put(MediaStore.Images.Media.IS_PENDING, 1);

                Uri collection = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                Uri itemUri = resolver.insert(collection, contentValues);

                if (itemUri != null) {
                    try (OutputStream out = resolver.openOutputStream(itemUri)) {
                        if (out != null) {
                            out.write(imageBytes);
                            out.flush();
                        }
                    }
                    contentValues.clear();
                    contentValues.put(MediaStore.Images.Media.IS_PENDING, 0);
                    resolver.update(itemUri, contentValues, null, null);
                    saved = true;
                    savedPath = itemUri.toString();
                }
            } else {
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "SalikFastFood");
                if (!dir.exists()) {
                    dir.mkdirs();
                }
                File imageFile = new File(dir, fileName);
                try (FileOutputStream fos = new FileOutputStream(imageFile)) {
                    fos.write(imageBytes);
                    fos.flush();
                }
                saved = true;
                savedPath = imageFile.getAbsolutePath();
                android.media.MediaScannerConnection.scanFile(context, new String[]{imageFile.getAbsolutePath()}, new String[]{"image/png"}, null);
            }

            if (saved) {
                final Context toastContext = context;
                getActivity().runOnUiThread(() -> {
                    Toast.makeText(toastContext, "Receipt saved to Gallery (Pictures/SalikFastFood)", Toast.LENGTH_SHORT).show();
                });
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("path", savedPath);
                call.resolve(ret);
            } else {
                call.reject("Failed to save image to gallery");
            }
        } catch (Exception e) {
            call.reject("Save failed: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void shareReceiptWhatsApp(PluginCall call) {
        String base64Data = call.getString("base64");
        String fileName = call.getString("fileName");
        if (fileName == null || fileName.trim().isEmpty()) {
            fileName = "Receipt-" + System.currentTimeMillis() + ".png";
        }
        if (!fileName.toLowerCase().endsWith(".png")) {
            fileName = fileName + ".png";
        }
        String caption = call.getString("caption", "");
        String phone = call.getString("phone", "");

        if (base64Data == null || base64Data.trim().isEmpty()) {
            call.reject("Image data is missing");
            return;
        }

        try {
            if (base64Data.contains(",")) {
                base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
            }
            byte[] imageBytes = Base64.decode(base64Data, Base64.DEFAULT);
            Context context = getContext();

            File cacheDir = new File(context.getCacheDir(), "receipts");
            if (!cacheDir.exists()) {
                cacheDir.mkdirs();
            }
            File imageFile = new File(cacheDir, fileName);
            try (FileOutputStream fos = new FileOutputStream(imageFile)) {
                fos.write(imageBytes);
                fos.flush();
            }

            Uri contentUri = FileProvider.getUriForFile(
                context,
                context.getPackageName() + ".fileprovider",
                imageFile
            );

            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("image/png");
            shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            String cleanPhone = phone != null ? phone.replaceAll("[^0-9]", "") : "";
            if (cleanPhone.startsWith("0")) {
                cleanPhone = "92" + cleanPhone.substring(1);
            }

            PackageManager pm = context.getPackageManager();
            boolean hasWhatsApp = isAppInstalled("com.whatsapp", pm);
            boolean hasWhatsAppBiz = isAppInstalled("com.whatsapp.w4b", pm);

            if (hasWhatsApp || hasWhatsAppBiz) {
                String targetPackage = hasWhatsApp ? "com.whatsapp" : "com.whatsapp.w4b";
                shareIntent.setPackage(targetPackage);

                if (!cleanPhone.isEmpty()) {
                    shareIntent.putExtra("jid", cleanPhone + "@s.whatsapp.net");
                }

                try {
                    getActivity().startActivity(shareIntent);
                } catch (Exception ex) {
                    shareIntent.setPackage(null);
                    Intent chooser = Intent.createChooser(shareIntent, "Share Receipt Image via WhatsApp");
                    chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    getActivity().startActivity(chooser);
                }
            } else {
                Intent chooser = Intent.createChooser(shareIntent, "Share Receipt Image via WhatsApp");
                chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getActivity().startActivity(chooser);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Share failed: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void printReceipt(PluginCall call) {
        String html = call.getString("html");
        String printJobName = call.getString("name");
        if (printJobName == null || printJobName.trim().isEmpty()) {
            printJobName = "Salik-Receipt-" + System.currentTimeMillis();
        }

        if (html == null || html.trim().isEmpty()) {
            call.reject("HTML content is missing");
            return;
        }

        final String finalHtml = html;
        final String finalJobName = printJobName;

        getActivity().runOnUiThread(() -> {
            try {
                WebView printWebView = new WebView(getContext());
                printWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        try {
                            PrintManager printManager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                            if (printManager != null) {
                                PrintDocumentAdapter printAdapter = view.createPrintDocumentAdapter(finalJobName);
                                PrintAttributes.MediaSize roll80mm = new PrintAttributes.MediaSize("ROLL_80MM", "80mm Thermal Receipt", 3150, 7874);
                                PrintAttributes printAttributes = new PrintAttributes.Builder()
                                        .setMediaSize(roll80mm)
                                        .setColorMode(PrintAttributes.COLOR_MODE_MONOCHROME)
                                        .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                                        .build();
                                printManager.print(finalJobName, printAdapter, printAttributes);
                                JSObject ret = new JSObject();
                                ret.put("success", true);
                                call.resolve(ret);
                            } else {
                                call.reject("PrintManager is not available on this device");
                            }
                        } catch (Exception e) {
                            call.reject("Printing failed: " + e.getMessage(), e);
                        }
                    }
                });

                printWebView.loadDataWithBaseURL("https://salikfastfood.local/", finalHtml, "text/html", "UTF-8", null);
            } catch (Exception e) {
                call.reject("Failed to initialize printer: " + e.getMessage(), e);
            }
        });
    }

    private boolean isAppInstalled(String packageName, PackageManager packageManager) {
        try {
            packageManager.getPackageInfo(packageName, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }
}
