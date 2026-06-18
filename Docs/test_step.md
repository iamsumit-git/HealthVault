Viewed main.py:1-43

Here is the step-by-step guide to testing the **PostCare India** application on your physical mobile device using **Expo Go**.

---

## 📱 Phase 1: Set Up Expo Go on Your Physical Device
1. Open the **App Store** (iOS) or **Google Play Store** (Android) on your physical phone.
2. Search for **"Expo Go"** and install the app (it has a black icon with a white dynamic arrow design).

---

## 🌐 Phase 2: Connect the Mobile App to the Backend API
Since the backend is running inside Docker on your host computer (`localhost:8000`), a physical phone connected to your Wi-Fi cannot resolve `localhost` (as it points to the phone itself). You must point the mobile client to your computer's local network IP address.

### Step 1: Find Your Computer's Local IP Address
1. Open a terminal (PowerShell / Command Prompt) on your host Windows machine.
2. Run the command:
   ```powershell
   ipconfig
   ```
3. Locate your active connection (usually under **Wireless LAN adapter Wi-Fi** or **Ethernet adapter**) and copy the **IPv4 Address** (e.g., `192.168.1.15`).

### Step 2: Configure the API Base URL in the App
1. Open the file [api.ts](file:///d:/odido/EAI_19.3/sumit/AI/HealthVault/mobile/src/services/api.ts).
2. Change the `getBaseURL` function to return your host computer's IPv4 address instead of `localhost` or `10.0.2.2`. 
   
   Replace:
   ```typescript
   const getBaseURL = () => {
     if (__DEV__) {
       if (Platform.OS === "android") {
         return "http://10.0.2.2:8000/api/v1";
       }
       return "http://localhost:8000/api/v1";
     }
     return "http://localhost:8000/api/v1";
   };
   ```
   With (using your exact IPv4 address, for example, `192.168.1.15`):
   ```typescript
   const getBaseURL = () => {
     return "http://192.168.1.15:8000/api/v1"; // Put your computer's IP address here
   };
   ```

### Step 3: Ensure Same Wi-Fi Connection
> [!IMPORTANT]
> Your host computer and your physical mobile phone **MUST be connected to the exact same Wi-Fi network**. If one is on cellular data or a different Wi-Fi band/guest network, they will not be able to communicate.

---

## 🚀 Phase 3: Run the Application

### Step 1: Verify Backend is Running
Verify your Docker containers are active:
```bash
docker ps
```
You should see `healthvault_backend` (port `8000`), `healthvault_db`, and `healthvault_minio` (ports `9000-9001`) up and running.

### Step 2: Start the Expo Packager
In your terminal, navigate to the `mobile` folder and start the dev server:
```bash
cd mobile
npm run start
```
This will launch the Expo compiler and display a large **QR Code** in your terminal.

### Step 3: Launch the App on Your Phone
- **On Android**: Open the **Expo Go** app and tap **"Scan QR Code"** to scan the QR code printed in your computer's terminal.
- **On iOS**: Open the native iOS **Camera app**, point it at the terminal QR code, and tap the notification prompt to open it in **Expo Go**.

*Expo Go will compile the JavaScript bundle and boot the PostCare application on your phone!*

---

## 🧪 Phase 4: Step-by-Step Test Guide

Follow this test workflow to validate the features of your medical record locker:

### Test Case 1: Send & Verify Mock OTP (Login)
1. Launch the app on your phone. You will land on the **Login Screen**.
2. Select the **Email** tab and enter any mock email (e.g., `test@family.in`).
3. Tap **Get Verification Code**.
4. An alert will appear showing your **Dev Sandbox Mock Code** (this is also printed in the backend docker logs).
5. Tap OK, enter the 6-digit code on the **Verification Screen**, and tap **Verify Code**.
6. The app will redirect you to the main dashboard timeline.

### Test Case 2: Set Up Your Profile
1. Tap the **Profile** tab in the bottom navigation.
2. Enter details:
   - **Full Name**: `Sumit Vijay`
   - **Date of Birth**: `1995-06-18`
   - **Blood Group**: `O+`
   - **Allergies**: `Penicillin, Dust`
   - **Chronic Conditions**: `None`
3. Tap **Save Profile**. You will see a success alert.

### Test Case 3: Upload a Medical Record
1. Tap the **Upload** tab in the bottom navigation.
2. Choose a file source:
   - **Camera**: Take a picture of a mock report or prescription.
   - **PDF/File**: Choose a PDF file from your phone storage.
3. Enter a Title (e.g. `General Checkup Prescription`).
4. Select the Document Type as **Prescription**.
5. Tap **Upload & Process**.
6. On success, check the backend server terminal to verify the background OCR task, pgvector embedding creation, and Gemini structured extraction have run successfully.

### Test Case 4: View AI Insights
1. Go back to the **Timeline** tab (home screen). Your newly uploaded record will appear.
2. Tap the record card.
3. If processing is complete, you will see:
   - **🔬 Report Summary**: A friendly explanation.
   - **💊 Prescribed Medications**: AI-extracted medicines and dosages.
   - **📊 Lab Metrics**: Table of results showing normal/abnormal bounds (if you uploaded a lab report).
   - **⚠️ Attention Indicators**: Yellow warnings highlighting abnormalities.

### Test Case 5: Secure Sharing
1. Scroll down on the document details page and tap **Share Secure Report Link**.
2. Select link expiration (e.g., `24 Hrs`).
3. Tap **Generate Share Link**.
4. The secure URL is generated. Tap the **Copy** icon next to it.
5. Open a browser window on your computer or phone and navigate to the link to verify the shared documents.

### Test Case 6: RAG AI Assistant Chat
1. Tap the **PostCare AI** tab in the bottom navigation.
2. Type a question: *"What medicine was prescribed to me?"*
3. The AI assistant will process your request, retrieve your records via vector search, and reply:
   - It will explain the medications and include the RAG citation badge: `📄 General Checkup Prescription`.
   - Tap the citation badge to jump directly back to the document viewer.