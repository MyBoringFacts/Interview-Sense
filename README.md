## Interview Sense

Interview Sense is an AI-powered mock interview coach built with Next.js and the Google Gemini API. It lets judges (and users) run realistic interview sessions, get structured feedback, and review AI-generated notes and analytics.

### Tech stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **UI**: React 19, Tailwind CSS, Radix UI, shadcn-style components
- **AI**: Google Gemini via `@google/genai`
- **Data / Auth**: Firebase

### Project structure

- **`interview_sense/`**: main Next.js app (all commands below are run from here)
- **`interview_sense/app/api/*`**: API routes (Gemini, evaluation, notes, etc.)
- **`interview_sense/components/*`**: UI and feature components (interview flows, dashboards, etc.)

---

### Prerequisites

- **Node.js**: 20.x LTS (recommended)  
- **Package manager**: npm (bundled with Node)
- **Google Gemini API key**
- **Firebase project** with Web app credentials

You do **not** need any extra global CLIs beyond Node/npm.

---

### Environment variables

All runtime configuration lives in `interview_sense/.env.local`.  
For convenience, we ship `interview_sense/.env.example` – copy and fill it in:

```bash
cd interview_sense
cp .env.example .env.local  # On Windows PowerShell:
copy .env.example .env.local
```

Then edit `.env.local` and set:

- **Gemini**: API key and any model/endpoint configuration referenced in `app/api/*` routes
- **Firebase**: `apiKey`, `authDomain`, `projectId`, etc., matching your Firebase Web app

The `.env.local` file is **not** committed; each judge can safely use their own keys.

---

### Local development

From the repo root:

```bash
cd interview_sense
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser.

You should see the Interview Sense UI and be able to start a mock interview session using your Gemini/Firebase configuration.

---

### Reproducible testing instructions (for judges)

This section is written specifically so that judges can reliably reproduce and evaluate the project from a clean checkout.

#### 1. Fresh clone

```bash
git clone <this-repo-url>
cd google_gemini_hackathon
cd interview_sense
```

All commands below assume you are now inside the `interview_sense` folder.

#### 2. Node version

Use **Node 20.x LTS**. On Windows, you can confirm with:

```bash
node -v
```

If you are on a different major version and encounter issues, please switch to Node 20.x using your preferred version manager (nvm, fnm, Volta, etc.).

#### 3. Install dependencies

```bash
npm install
```

This installs both runtime and dev dependencies required by Next.js, Tailwind CSS, and the Gemini/Firebase integrations.

#### 4. Configure environment

Use the example file as your template:

```bash
copy .env.example .env.local   # PowerShell on Windows
```

Open `.env.local` and fill in:

- A valid **Google Gemini API key** (matching the quotas/permissions for text + evaluation)
- A **Firebase** config for a test project (values can be for a dedicated sandbox project)

Judges can reuse an existing Gemini/Firebase sandbox across multiple projects – no schema migrations are required by this app.

#### 5. Start the dev server

```bash
npm run dev
```

Wait until Next.js reports that it is ready and listening on port **3000**.

Then open in a browser:

```text
http://localhost:3000
```

#### 6. Manual test flow

- **Create or join** a mock interview session from the main screen.
- **Select** a role or interview type if prompted (e.g., general SWE interview).
- **Answer questions**: speak or type your responses depending on the UI options.
- After a short delay, the backend will:
  - Call **Gemini** to generate feedback and evaluation
  - Persist notes/analytics in **Firebase**
- Inspect:
  - **Interview transcript / notes**
  - **Scores / evaluation metrics**
  - Any **follow-up questions** or suggested improvements

This completes a full end‑to‑end path that exercises:

- Frontend flows and UI
- API routes under `app/api/*` (including Gemini calls)
- Firebase integration for persistence

#### 7. Optional: lint check

To verify code style/linting:

```bash
npm run lint
```

This uses the repo’s ESLint configuration and should complete without blocking functional testing.

---

### Production build sanity check (optional)

To confirm that the app builds successfully in production mode:

```bash
cd interview_sense
npm run build
npm start
```

Then visit `http://localhost:3000` and repeat the core test flow.

---

### Notes for judges

- The **only required secrets** are the Gemini API key and Firebase Web config values in `.env.local`.
- There is **no need** to seed a database; the app can run against an empty Firebase project and will create its own collections/documents as needed.
- If you experience any issues following these steps, please check:
  - Node version (`node -v`)
  - That `.env.local` exists and contains valid keys
  - That `npm run dev` or `npm run build` logs do not show missing environment variables.

