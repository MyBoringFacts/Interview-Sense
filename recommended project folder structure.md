# Recommended Project Folder Structure for InterviewSense

We are using a Next.js Monolithic architecture where both the UI and backend logic are housed within the same application. This allows for a simplified deployment on Google Cloud Run.

```
google_gemini_hackathon/
│
├── interview_sense/                # (Monolithic Next.js Application)
│   ├── app/                        # Next.js App Router
│   │   ├── api/                    # API Routes (Backend Services)
│   │   │   ├── session/            # Session management API
│   │   │   ├── evaluate/           # Evaluation logging API
│   │   │   └── discovery/          # Question discovery engine
│   │   ├── dashboard/              # Post-interview analytics pages
│   │   ├── interview/              # Live interview session interface
│   │   ├── layout.tsx              
│   │   └── page.tsx                # Landing/Lobby page
│   ├── components/                 # React UI Components
│   │   ├── ui/                     # Generic UI elements (shadcn/ui, framer motion)
│   │   ├── interview/              # Specialized components (visualizer, video feed)
│   │   └── dashboard/              # Charts, feedback reports
│   ├── hooks/                      # Custom hooks (e.g., useAudioStream, useScreenShare)
│   ├── lib/                        # Shared Utilities & Services
│   │   ├── gemini.ts               # Gemini API SDK wrappers
│   │   ├── firebase.ts             # Cloud Firestore DB client
│   │   ├── storage.ts              # Cloud Storage client
│   │   └── types.ts                # TypeScript interfaces (Session, Evaluations)
│   ├── public/                     # Static assets
│   ├── next.config.mjs
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                           # Documentation
│   ├── architecture diagram.md
│   └── project_overview.md
│
└── README.md
```