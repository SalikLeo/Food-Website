# Salik Fast Food — Mobile Apps (Customer & Admin)

This directory contains the complete Android mobile application projects for **Salik Fast Food**, powered by Capacitor:

| App | Target Folder | Package ID | Description |
| :--- | :--- | :--- | :--- |
| **Customer App** | `Mobile/customer/` | `com.salik.customer` | Full customer food ordering storefront, deals, menu, cart, and WhatsApp checkout. Admin access is hidden. |
| **Admin POS App** | `Mobile/admin/` | `com.salik.admin` | Dedicated staff/cashier app that launches directly into the Admin Dashboard for order management and receipt printing. |

---

## 🚀 Quick Start: How to Build & Export APKs

### 1. Build the Apps
From the project root (`d:\Work\Food Website`), run:

```bash
# Build Customer App:
npm run build:customer

# Build Admin App:
npm run build:admin
```
*This compiles the optimized web assets and automatically syncs them into the Android projects.*

---

### 2. Open in Android Studio & Export APK

#### Customer App:
```bash
npm run open:customer
```
- In Android Studio, wait for Gradle sync to complete.
- Click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
- Once finished, click **"locate"** in the notification. You will find `app-debug.apk`.
- Copy this file to your Android phone via USB or WhatsApp and install it!

#### Admin POS App:
```bash
npm run open:admin
```
- Follow the same steps (**Build > Build APK(s)**).
- Install `app-debug.apk` on your counter tablet or cashier phone.

---

## 📶 Network Connection: Local Wi-Fi vs Cloud (Hostinger)

### Current Setup: Local Wi-Fi (`http://192.168.1.2:5000`)
Both apps are pre-configured to communicate with your backend running on your laptop:
- Make sure your laptop and Android phone are on the **same Wi-Fi network**.
- Start your server on your laptop: `npm run server` or `node server/index.js`.
- The apps will instantly load menu items, deals, and place orders directly to your local database!

> **If your laptop's Wi-Fi IP address ever changes:**
> 1. Check your new IP with `ipconfig`.
> 2. Open `src/config/api.js` and update `DEFAULT_MOBILE_API = 'http://YOUR_NEW_IP:5000'`.
> 3. Re-run `npm run build:customer` and `npm run build:admin`.

---

### ☁️ Switching to Hostinger / Cloud Later (1-Minute Step)

When you deploy your backend to Hostinger or a cloud VPS:
1. Create or edit a `.env` file in the project root:
   ```env
   VITE_API_URL=https://api.yourdomain.com
   ```
2. Re-run the build commands:
   ```bash
   npm run build:customer
   npm run build:admin
   ```
3. Re-export your APKs in Android Studio. That's it!
