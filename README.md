# MediFlow - Voice AI Patient Registration System

MediFlow is a modern, voice-enabled patient registration and intake platform designed for healthcare facilities. It integrates ambient Voice AI, automated telephony hotlines, structured schema validation, and database persistence to streamline front-desk patient onboarding.

---

## 🌐 Live Application URL

The application is deployed and live at:

👉 **[https://voice-ai-patient-registration.vercel.app/](https://voice-ai-patient-registration.vercel.app/)**

---

## 📞 Integrated AI Phone Hotline Number

Project reviewers and patients can test live 24/7 phone intake by calling:

**Phone Number:** `+1 (346) 359-1511`

*Calling this number connects directly to our Vapi Voice AI Registration Assistant. The AI conducts a natural conversation to collect demographic, contact, and insurance details, automatically persisting the structured patient record to the Supabase database.*

---

## 🚀 Key Features

1. **24/7 Phone Registration Hotline**: Patients dial `+1 (346) 359-1511` from any phone to complete intake via AI voice calls.
2. **In-Browser Web Voice Assistant**: Front desk staff or patients can complete intake via browser microphone powered by the Vapi Web SDK.
3. **Patient Directory**: Interactive dashboard displaying registered patients with real-time stats and metrics.
4. **Patient Record Management & Deletion**: Front desk admins can view full patient demographics, insurance info, emergency contacts, and **delete patient records** directly from the UI.
5. **Emergency Fast Entry**: Modal dialog for manual patient registration when voice input is unavailable.
6. **Supabase Database Persistence**: Enterprise-grade PostgreSQL backend with soft-delete capabilities.

---

## 🛠 Project Architecture & Workflow Procedure

### 1. Patient Intake Flow
- **Phone Intake**: Calls to `+1 (346) 359-1511` trigger Vapi AI assistant tool calls, posting extracted JSON payloads to the `/vapi/create-patient` webhook endpoint on our Express backend server.
- **Web Intake**: Users navigate to the **Voice Registration** tab and click **Initialize Session** or the microphone button to start a real-time web audio call.
- **Manual Intake**: Front desk admins click **New Patient** or **Emergency Entry** to submit patient details via modal form.

### 2. Validation & Database Insertion
- Incoming data is validated against a Zod schema in `server.js` ensuring required demographic fields, date formatting, and phone number validation.
- Valid records are saved into the Supabase `patients` table.

### 3. Patient Review & Deletion
- Front desk staff view active patients in the **Patient Directory**.
- Clicking **View Details** opens full demographic and insurance snapshots.
- Clicking **Delete** prompts a confirmation dialog and issues a `DELETE /patients/:id` request, soft-deleting the record (`deleted_at = timestamp`) so it is safely archived without data destruction.

---

## 📋 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/patients` | Retrieves all active (non-deleted) patient records from Supabase. |
| `GET` | `/patients/:id` | Retrieves details for a single patient by ID. |
| `POST` | `/patients` | Registers a new patient record (validated via Zod). |
| `POST` | `/vapi/create-patient` | Webhook endpoint for Vapi Voice AI telephony tool calls. |
| `PUT` | `/patients/:id` | Updates an existing patient record. |
| `DELETE` | `/patients/:id` | Soft-deletes a patient record from active view. |
| `GET` | `/api/health` | API health check endpoint. |

---

## 🧪 Step-by-Step Review Instructions

### Step 1: Review Phone Intake
1. Dial **`+1 (346) 359-1511`** from your phone.
2. Speak with the Vapi Voice AI Assistant to provide your name, DOB, address, and insurance.
3. Open the web dashboard and refresh the **Patient Directory** to observe your new record appearing automatically.

### Step 2: Review In-Browser Voice Intake
1. Open the app in your browser.
2. Navigate to **Voice Registration** from the sidebar.
3. Click the microphone button to start a call, speak your registration details, and confirm.

### Step 3: Review Patient Deletion
1. Go to the **Patient Directory** tab.
2. Find any patient row and click the red **Delete** button (or click **View Details** and then click **Delete Patient**).
3. Confirm the deletion prompt.
4. Verify the patient record is immediately removed from the active directory and metrics are updated.

---

## 💻 Local Setup & Development

### 1. Environment Configuration
Create a `.env` file in the root directory with your Supabase and Vapi credentials:
```env
SUPABASE_URL=https://your-supabase-url.supabase.co
SUPABASE_KEY=your_supabase_anon_key
VAPI_PUBLIC_KEY=your_vapi_public_key
VAPI_ASSISTANT_ID=your_vapi_assistant_id
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Server
```bash
npm start
```
The application will run on `http://localhost:3000`.

---

## 📄 License
ISC License. Built for MediFlow Voice AI Patient Registration.
