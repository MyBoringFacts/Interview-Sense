# Deploying InterviewSense to Google Cloud Run
### A beginner-friendly, click-by-click guide

---

## What You'll Need First

Before starting, make sure you have accounts on these three services. All have free tiers.

- **Google account** — gmail works fine
- **Firebase project** — you likely already have one since the app uses it
- **Gemini API key** — the key your app already uses locally

---

## Part A — Install Tools on Your Computer (one-time setup)

### A1. Install Docker Desktop

Docker packages your app into a portable container so it can run anywhere on GCP.

1. Go to **https://www.docker.com/products/docker-desktop/**
2. Click the **Download Docker Desktop** button for Windows
3. Run the installer — accept all defaults
4. Once installed, launch **Docker Desktop** from the Start Menu
5. Wait until the whale icon in your taskbar says **"Docker Desktop is running"**
   - You should see a green dot in the bottom-left of the Docker window

> Docker must be running in the background for every step that follows. You don't need to do anything inside the Docker window — just keep it open.

---

### A2. Install Google Cloud SDK (gcloud)

This is a command-line tool that lets you talk to Google Cloud from your terminal.

1. Go to **https://cloud.google.com/sdk/docs/install**
2. Under **Windows**, click **Download the Cloud SDK installer**
3. Run the downloaded `.exe` file
4. During installation:
   - Leave all checkboxes at their defaults
   - On the last screen, make sure **"Run gcloud init"** is checked, then click **Finish**
5. A terminal window will open automatically asking you to log in — **press Enter** to open your browser
6. Sign in with your Google account in the browser
7. Come back to the terminal and press Enter again to confirm

**Verify it worked** — open PowerShell and type:
```
gcloud version
```
You should see a version number printed. If you get "command not found", restart PowerShell and try again.

---

## Part B — Set Up Google Cloud Project

### B1. Create a New Google Cloud Project

1. Go to **https://console.cloud.google.com**
2. At the very top of the page, click the **project dropdown** (it shows your current project name next to the Google Cloud logo)
3. Click **"New Project"** in the top-right of the popup
4. Fill in:
   - **Project name:** `InterviewSense` (or anything you like)
   - **Project ID:** This auto-fills — write it down, you'll use it throughout this guide. It looks like `interviewsense-123456`
5. Click **Create**
6. Wait a few seconds, then click the **notification bell** in the top-right — click **"Select Project"** when it appears

> Your Project ID is the critical piece. It's shown in the URL and the top project dropdown. Keep a note of it.

---

### B2. Enable Billing (Required for Cloud Run)

Cloud Run needs a billing account linked, even though it has a generous free tier.

1. In the Google Cloud Console, click the **hamburger menu** (☰) in the top-left
2. Click **Billing**
3. Click **Link a billing account** or **Manage billing accounts**
4. Follow the prompts to add a credit card
   - You will **not be charged** unless you exceed free tier limits (which is hard to do for a personal project)

---

### B3. Enable Required APIs

You need to turn on three Google Cloud services.

1. Still in the Cloud Console, click the **hamburger menu** (☰) → **APIs & Services** → **Library**
2. Search for **"Cloud Run Admin API"** → click it → click **Enable**
3. Go back to the Library, search for **"Artifact Registry API"** → click it → click **Enable**
4. Go back to the Library, search for **"Cloud Build API"** → click it → click **Enable**

All three should now show **"API Enabled"** on their pages.

---

## Part C — Set Up a Place to Store Your Docker Image

Google Cloud needs to store the packaged version of your app before deploying it. This is called a **container registry**.

### C1. Create an Artifact Registry Repository

1. In the Cloud Console, click the **hamburger menu** (☰) → scroll down and find **Artifact Registry** → click **Repositories**
2. Click **+ Create Repository** at the top
3. Fill in:
   - **Name:** `interview-sense`
   - **Format:** Docker
   - **Mode:** Standard
   - **Location type:** gcloud config get-value project
   - **Region:** Choose one close to you (e.g. `us-central1` for US, `asia-southeast1` for Southeast Asia, `europe-west1` for Europe)
4. Leave everything else as default and click **Create**

> Write down the region you chose — you'll need it in later steps.

---

## Part D — Connect Your Terminal to Google Cloud

Open **PowerShell** (search "PowerShell" in the Start Menu).

### D1. Log In

```powershell
gcloud auth login
```

This opens your browser. Sign in with your Google account, then close the browser and return to PowerShell.

---

### D2. Set Your Project

Replace `YOUR_PROJECT_ID` with the project ID you wrote down in step B1.

```powershell
gcloud config set project YOUR_PROJECT_ID
```

You should see: `Updated property [core/project].`

---

### D3. Connect Docker to Your Registry

Replace `asia-southeast3` with whatever region you chose in step C1.

```powershell
gcloud auth configure-docker asia-southeast3-docker.pkg.dev
```

When asked `Do you want to continue?`, type `Y` and press Enter.

---

## Part E — Collect Your Environment Variables

Your app needs several secret values that you need to gather before building.

### E1. Get Your Firebase Config Values

1. Go to **https://console.firebase.google.com**
2. Click on your project
3. Click the **gear icon** (⚙️) next to "Project Overview" in the left sidebar → **Project settings**
4. Scroll down to **"Your apps"** section
5. If you see a web app listed, click the `</>` icon on it. If not, click **"Add app"** → choose the **Web** icon (`</>`) → give it a name → click **Register app**
6. You'll see a block of code like this:

```
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  measurementId: "G-XXXXXXXX"
};
```

7. Copy each value into a text file like this (keep this file safe — it's sensitive):

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXX
```

---

### E2. Get Your Gemini API Key

1. Go to **https://aistudio.google.com/apikey**
2. Click **"Create API Key"**
3. Copy the key and add it to your text file:

```
GEMINI_API_KEY=AIzaSy...
```

---

## Part F — Build Your Docker Image

This step packages your entire app into a Docker image. It takes 3–5 minutes.

Open PowerShell and navigate to your project folder:

```powershell
cd c:\Users\TDH\VIIIIIV\MVIIXXIV\2026\Lab\google_gemini_hackathon\interview_sense
```

Now run the build command below. **Replace every `your_value_here` with the actual values from your text file in Step E.** Also replace `YOUR_PROJECT_ID` with your GCP project ID, and `us-central1` with your chosen region.

```powershell
docker build `
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="your_value_here" `
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_value_here" `
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_value_here" `
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_value_here" `
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_value_here" `
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="your_value_here" `
  --build-arg NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="your_value_here" `
  -t us-central1-docker.pkg.dev/interviewsense-11d21/interview-sense/app:latest `
  .
```

> The backtick `` ` `` at the end of each line is PowerShell's way of continuing a long command on the next line. Make sure there is no space after each backtick.

While it runs, you'll see lots of output. Wait until you see:
```
Successfully built ...
Successfully tagged ...
```

---

## Part G — Upload the Image to Google Cloud

```powershell
docker push asia-southeast3-docker.pkg.dev/interviewsense-11d21/interview-sense/app:latest
```

This uploads the image to the Artifact Registry you created in Part C. It may take 1–3 minutes depending on your internet speed. You'll see progress bars for each layer.

**Verify it worked:**
1. Go back to **https://console.cloud.google.com**
2. Click **hamburger menu** (☰) → **Artifact Registry** → **Repositories**
3. Click **interview-sense** → you should see an image named `app` listed there

---

## Part H — Deploy to Cloud Run

This is the final step — it takes your uploaded image and runs it as a live website.

### H1. Deploy via Command

In PowerShell, run this command. Replace:
- `YOUR_PROJECT_ID` → your GCP project ID
- `us-central1` → your chosen region
- `your_gemini_api_key` → your Gemini API key from Step E2

```powershell
gcloud run deploy interview-sense `
  --image asia-southeast3-docker.pkg.dev/interviewsense-11d21/interview-sense/app:v2 `
  --platform managed `
  --region asia-southeast3  `
  --allow-unauthenticated `
  --port 3000 `
  --memory 512Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 10 `
  --set-env-vars "GEMINI_API_KEY=your_gemini_api_key"
```

When it finishes, you'll see something like:

```
Service URL: https://interview-sense-xxxxxxxxxx-uc.a.run.app
```

**Copy that URL — that is your live website!** Open it in your browser to confirm it loads.

---

### H2. Verify in the Cloud Console

1. Go to **https://console.cloud.google.com**
2. Click **hamburger menu** (☰) → **Cloud Run**
3. You should see `interview-sense` listed with a green checkmark
4. Click on it to see traffic, logs, and your service URL

---

## Part I — Fix Firebase Auth (Important!)

Firebase Authentication blocks sign-ins from unknown domains. You must whitelist your new Cloud Run URL.

1. Go to **https://console.firebase.google.com**
2. Click on your project
3. In the left sidebar, click **Authentication**
4. Click the **Settings** tab at the top
5. Scroll down to **Authorized domains**
6. Click **Add domain**
7. Paste your Cloud Run domain — **just the domain, without `https://`**
   - Example: `interview-sense-xxxxxxxxxx-uc.a.run.app`
8. Click **Add**

Now try signing in on your deployed app — it should work.

---

## Part J — Updating Your App in the Future

Every time you make changes to the code and want to redeploy:

1. Rebuild the image (same command as Part F, but change `latest` to `v2`, `v3`, etc.)
2. Push it (same command as Part G, updated tag)
3. Redeploy (same command as Part H, updated image tag)

Or you can keep reusing the `latest` tag — Cloud Run will always pull the newest version.

---

## Troubleshooting

| Problem | What to do |
|---------|-----------|
| `docker: command not found` | Docker Desktop is not running — open it from Start Menu and wait for the green dot |
| `gcloud: command not found` | Restart PowerShell after installing gcloud, or reinstall it |
| Build fails with npm errors | Make sure you're in the `interview_sense` folder when running `docker build` |
| Site loads but sign-in fails | You forgot to add your Cloud Run domain to Firebase Authorized Domains (Part I) |
| Site loads but AI doesn't respond | Your `GEMINI_API_KEY` may be wrong — double-check it in Cloud Run → Edit & Deploy → Variables |
| `Permission denied` on push | Re-run `gcloud auth configure-docker us-central1-docker.pkg.dev` |
| `Project not found` | Re-run `gcloud config set project YOUR_PROJECT_ID` with the correct ID |

---

## Cost Reminder

Cloud Run's free tier includes **2 million requests/month** and **360,000 GB-seconds of memory** — more than enough for a personal project or hackathon demo. You will only pay if you get significant traffic. The `--min-instances 0` setting means the service shuts down when nobody is using it, costing nothing while idle.


