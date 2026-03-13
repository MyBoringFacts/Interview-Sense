flowchart LR

User[User]

subgraph Frontend["Next.js Frontend"]
UI[Interview UI]
Audio[Microphone Stream]
Screen[Screen Capture]
WS[WebSocket Client]
Dashboard[Analytics Dashboard]
end

subgraph AI["Gemini Live Agent"]
Gemini[Gemini Live API]
AgentLogic[Agent Reasoning]
Tools[Tool Calls]
end

subgraph Backend["Node Backend on Cloud Run"]
SessionAPI[Session API]
EvalAPI[Evaluation Processor]
UploadAPI[Audio Upload Service]
end

subgraph Cloud["Google Cloud"]
Firestore[(Firestore Database)]
Storage[(Cloud Storage)]
end

User --> UI
User --> Audio
User --> Screen

Audio --> WS
Screen --> WS

WS --> Gemini
Gemini --> AgentLogic
AgentLogic --> Tools

Tools --> EvalAPI
EvalAPI --> Firestore

UI --> SessionAPI
SessionAPI --> Firestore

UploadAPI --> Storage

Firestore --> Dashboard
Dashboard --> UI