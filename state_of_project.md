# State of the Project: InterviewSense

**Date:** March 15, 2026  
**Status:** 🟢 Active Development / Prototype Phase

---

## 1. Executive Summary
InterviewSense is a state-of-the-art, real-time AI technical interview agent. It leverages the **Gemini Live API** to provide natural voice-based mock interviews with multimodal awareness (screen sharing). The project is currently in a functional prototype stage with core authentication, interview streaming, and data persistence layers fully implemented.

---

## 2. Technology Stack
The project uses a modern, high-performance stack optimized for real-time interaction:

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4.
- **AI/LLM:** Gemini 2.0 Flash (via Gemini Live API v1alpha).
- **Backend-as-a-Service:** Firebase (Firestore for NoSQL data, Auth for user management, Storage for assets).
- **Real-time Comms:** WebSockets (managed via custom `useGeminiLive` hook).
- **Styling & UI:** Framer Motion (animations), Shadcn UI, Lucide-React.

---

## 3. Current Implementation Status

### ✅ Completed Features
- **Project Foundation:** Integrated Next.js with Tailwind CSS 4 and professional UI design system.
- **Authentication:** Full Firebase Auth integration (Sign-in/Sign-up).
- **Gemini Live Integration:** 
    - Real-time bidirectional voice communication (PCM16 16kHz/24kHz).
    - Secure ephemeral token minting via `/api/live-token`.
    - Multimodal awareness: 1 FPS screen capture sent to Gemini for contextual understanding of code/diagrams.
- **Interview Workflow:**
    - Interview Setup: Personalized configuration (Company, Role, Difficulty).
    - Contextual Prompting: Dynamic system instruction generation using uploaded Resumes and Job Descriptions.
    - Live Transcription: Real-time display of AI and User conversation parts.
- **Data Layer:** 
    - Firestore schema and helper functions for Sessions, Users, and Evaluations.
    - Transitioned from mock data to real Firestore queries.

### 🟡 Work in Progress
- **Question Discovery Engine:** Refining the AI-powered module that scrapes and synthesizes real industry questions from public documentation.
- **Session Evaluation:** Implementing background tool calls for structured feedback during live sessions.
- **Dashboard & History:** UI for detailed analytics and historical session review.

### 🔴 Pending / Future
- **Video Playback:** Recording and replaying interview sessions with synchronized audio/video.
- **Advanced Feedback UI:** Charts and graphs for tracking improvement over time (Categorical scoring).
- **Fine-tuning Interruption Logic:** Further optimization of full-duplex voice handling.

---

## 4. Key Metrics & Progress
- **Architecture Stability:** Core WebSocket and PCM audio handling is robust.
- **UI/UX:** Premium aesthetic implemented across Landing, Dashboard (placeholder framework), and Interview pages.
- **Documentation:** `project_overview.md` and `database_schema.md` are up to date.

---

## 5. Immediate Next Steps
1. Finalize the **Interview Discovery** API logic to fetch real questions.
2. Complete the **Post-Interview Report** UI to display scores and notes from Firestore.
3. Implement persistent **Transcript Logging** to Firestore sessions upon completion.
