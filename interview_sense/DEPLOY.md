# Deploying InterviewSense to Google Cloud Run

This guide covers building the Docker image and deploying it to **Google Cloud Run** — the recommended serverless container platform for Next.js apps on GCP.

---

## Prerequisites

| Tool | Install |
|------|---------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Running locally |
| [Google Cloud SDK (`gcloud`)](https://cloud.google.com/sdk/docs/install) | `gcloud version` to verify |
| A Google Cloud project | [console.cloud.google.com](https://console.cloud.google.com) |
| A Firebase project | [console.firebase.google.com](https://console.firebase.google.com) |
| A Gemini API key | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

---

## Environment Variables

Copy `.env.example` and fill in your values before proceeding.

```bash
cp .env.example .env.local
```

**Two categories:**

| Variable | Type | When used |
|----------|------|-----------|
| `NEXT_PUBLIC_FIREBASE_*` | Client-side | Baked into the bundle **at build time** — passed as `--build-arg` |
| `GEMINI_API_KEY` | Server-side | Injected **at runtime** via Cloud Run — never baked into the image |

---

## Step 1 — Authenticate with Google Cloud

```bash
gcloud auth login
gcloud auth configure-docker
```

---

## Step 2 — Create / Select a GCP Project

```bash
# Create a new project (skip if you already have one)
gcloud projects create YOUR_PROJECT_ID --name="InterviewSense"

# Set it as the active project
gcloud config set project YOUR_PROJECT_ID
```

Replace `YOUR_PROJECT_ID` with a globally unique ID (e.g. `interview-sense-prod`).

---

## Step 3 — Enable Required GCP APIs

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

---

## Step 4 — Create an Artifact Registry Repository

Artifact Registry is GCP's managed Docker registry (replacing Container Registry).

```bash
gcloud artifacts repositories create interview-sense \
  --repository-format=docker \
  --location=us-central1 \
  --description="InterviewSense Docker images"
```

> Change `us-central1` to your preferred region (e.g. `asia-southeast1`, `europe-west1`).

Configure Docker to authenticate with Artifact Registry:

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

---

## Step 5 — Build the Docker Image

`NEXT_PUBLIC_*` Firebase variables must be passed at build time because Next.js
bakes them into the static bundle.

```bash
# From the interview_sense directory
docker build \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="your_value" \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_value" \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_value" \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_value" \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_value" \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="your_value" \
  --build-arg NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="your_value" \
  -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/interview-sense/app:latest \
  .
```

**Tip:** You can source values from your `.env.local` to avoid typing them manually:

```bash
# Load env vars from .env.local (PowerShell)
Get-Content .env.local | ForEach-Object {
  if ($_ -match '^([^#][^=]*)=(.*)$') {
    [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2])
  }
}

docker build `
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="$env:NEXT_PUBLIC_FIREBASE_API_KEY" `
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$env:NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" `
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="$env:NEXT_PUBLIC_FIREBASE_PROJECT_ID" `
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$env:NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" `
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$env:NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" `
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="$env:NEXT_PUBLIC_FIREBASE_APP_ID" `
  --build-arg NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="$env:NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID" `
  -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/interview-sense/app:latest `
  .
```

---

## Step 6 — Push the Image to Artifact Registry

```bash
docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/interview-sense/app:latest
```

---

## Step 7 — Deploy to Cloud Run

```bash
gcloud run deploy interview-sense \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/interview-sense/app:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "GEMINI_API_KEY=your_gemini_api_key"
```

> `--allow-unauthenticated` makes the service publicly accessible. Remove this flag
> if you want to restrict access and handle auth through Firebase instead.

After deployment, `gcloud` will print a **Service URL** like:
```
https://interview-sense-xxxxxxxxxx-uc.a.run.app
```

---

## Step 8 — Update Firebase Authorized Domains

Firebase Authentication will block sign-in from unknown origins.

1. Go to [Firebase Console](https://console.firebase.google.com) → your project
2. Navigate to **Authentication** → **Settings** → **Authorized domains**
3. Add your Cloud Run URL (e.g. `interview-sense-xxxxxxxxxx-uc.a.run.app`)

---

## Step 9 — Verify the Deployment

```bash
# Open the service URL in your browser
gcloud run services describe interview-sense \
  --platform managed \
  --region us-central1 \
  --format "value(status.url)"
```

---

## Updating the Deployment

Rebuild the image with a new tag and redeploy:

```bash
# Build with a versioned tag
docker build [same --build-arg flags as above] \
  -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/interview-sense/app:v2 .

docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/interview-sense/app:v2

gcloud run deploy interview-sense \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/interview-sense/app:v2 \
  --platform managed \
  --region us-central1
```

---

## Using Cloud Build for CI/CD (Optional)

Instead of building locally, you can have GCP build the image for you:

```bash
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/interview-sense/app:latest \
  --substitutions \
    _NEXT_PUBLIC_FIREBASE_API_KEY="your_value",\
    _NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_value",\
    _NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_value",\
    _NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_value",\
    _NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_value",\
    _NEXT_PUBLIC_FIREBASE_APP_ID="your_value",\
    _NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="your_value"
```

Create a `cloudbuild.yaml` at the project root to fully automate build + deploy on every push.

---

## Storing Secrets Securely (Recommended for Production)

Instead of passing `GEMINI_API_KEY` as a plain env var, store it in **Secret Manager**:

```bash
# Create the secret
echo -n "your_gemini_api_key" | \
  gcloud secrets create GEMINI_API_KEY --data-file=-

# Grant Cloud Run access to the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:$(gcloud run services describe interview-sense \
    --platform managed --region us-central1 \
    --format='value(spec.template.spec.serviceAccountName)')" \
  --role="roles/secretmanager.secretAccessor"

# Redeploy referencing the secret
gcloud run deploy interview-sense \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/interview-sense/app:latest \
  --platform managed \
  --region us-central1 \
  --update-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

---

## Cost Notes

- Cloud Run charges only for request processing time (pay-per-use).
- With `--min-instances 0`, the service scales to zero when idle (free).
- Set `--min-instances 1` to eliminate cold starts at the cost of always-on billing.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Cannot find module` error at startup | Ensure `output: 'standalone'` is in `next.config.mjs` |
| Firebase auth blocked | Add Cloud Run domain to Firebase Authorized Domains |
| `GEMINI_API_KEY` undefined | Verify it's set in Cloud Run env vars, not missing |
| Build fails with missing packages | Check that `package-lock.json` is up to date and committed |
| Cold start timeouts | Set `--min-instances 1` or increase `--timeout` (default 300s) |
