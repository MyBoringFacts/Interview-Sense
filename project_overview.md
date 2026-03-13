# InterviewSense

### Real-Time Multimodal AI Technical Interview Agent

## 1. Project Overview

InterviewSense is a real-time AI-powered technical interview agent that conducts mock interviews while simultaneously analyzing the user's voice explanations, shared screen content, and problem-solving approach.

Traditional mock interview tools focus primarily on text or simple voice interaction and lack the ability to observe how candidates actually explain technical solutions using code editors, diagrams, or system design tools.

InterviewSense introduces a multimodal AI agent capable of:

• conducting natural voice-based interviews
• observing shared screens to analyze code or diagrams
• evaluating communication and reasoning in real time
• generating structured feedback and performance analytics

In addition, InterviewSense dynamically discovers relevant interview questions using AI-powered search. Instead of relying on a fixed question bank, the system quickly gathers commonly asked interview questions from online sources and synthesizes them into a structured interview set within approximately one minute.

The system uses the Gemini Live API to enable real-time multimodal interaction and runs on Google Cloud infrastructure to provide scalable storage and session analytics.

The goal of InterviewSense is to help developers practice technical interviews more effectively by receiving contextual, structured feedback on both their technical reasoning and communication clarity while being exposed to questions that reflect real industry interview patterns.

---

## 2. Problem Statement

Preparing for technical interviews often requires practicing multiple skills simultaneously:

• explaining algorithms or architecture verbally
• writing or reviewing code
• communicating clearly under pressure
• structuring system design explanations

Existing mock interview platforms typically provide only limited interaction methods such as:

• text-based chatbots
• static question lists
• asynchronous feedback

These approaches fail to simulate a realistic interview environment where candidates must speak, reason, and visually demonstrate their solutions at the same time.

Additionally, many interview preparation tools rely on static question banks that quickly become outdated or overly predictable. Real-world interviews vary widely across companies, roles, and experience levels, making static question lists insufficient for realistic preparation.

As a result, candidates cannot easily evaluate how well they communicate technical concepts while presenting diagrams or code, nor can they practice with dynamically generated interview scenarios that resemble real interviews.

---

## 3. Solution

InterviewSense solves this problem by introducing a **multimodal AI interview agent** capable of observing and interacting with multiple signals simultaneously while dynamically sourcing relevant interview questions.

The system enables a user to start a voice-based technical interview while sharing their screen to present code or architecture diagrams.

Before the interview begins, the system performs a rapid AI-assisted search that retrieves and synthesizes relevant interview questions from publicly available sources such as developer forums, interview preparation platforms, and community reports. This process typically completes within one minute and produces a customized interview plan tailored to the user's selected role and difficulty level.

During the session, the AI agent performs three key tasks.

### 1. Dynamic Interview Question Generation

Prior to the interview session, the system performs a quick AI-assisted search to identify commonly asked interview questions related to the selected role, difficulty level, and interview type.

The retrieved questions are analyzed and synthesized by the AI to generate a curated interview sequence that mimics realistic industry interviews.

This allows InterviewSense to adapt quickly to different roles such as:

• software engineering interviews
• system design interviews
• backend engineering interviews
• AI or machine learning interviews

The dynamic question retrieval process ensures the interview experience remains fresh, diverse, and aligned with current industry practices.

---

### 2. Real-Time Interview Conversation

The AI agent conducts a natural voice conversation with the user using Gemini Live API.

It asks interview questions, responds to explanations, and handles interruptions naturally, simulating the experience of interacting with a human interviewer.

---

### 3. Screen Observation

The system periodically captures frames from the user's shared screen and sends them to the Gemini multimodal model.

This allows the agent to understand visual content including:

• code written in editors
• architecture diagrams
• whiteboard explanations

The AI can then ask contextual follow-up questions based on what it observes.

---

### 4. Continuous Evaluation

While the interview is running, the agent silently logs structured evaluation events using background tool calls. These events measure aspects such as:

• technical reasoning
• system design quality
• communication clarity
• problem-solving approach

The collected evaluations are stored in a cloud database and later visualized in a user dashboard.

---

## 4. Key Features

### Real-Time Voice Interview Agent

Users interact with the AI interviewer through natural voice conversation.

The system supports full-duplex communication, allowing the user to interrupt the AI naturally during the discussion.

---

### Multimodal Screen Understanding

The AI agent observes the user's shared screen and can interpret visual content such as:

• code implementations
• system architecture diagrams
• technical documentation

This enables the agent to ask more contextual follow-up questions.

---

### Dynamic AI Question Discovery

InterviewSense dynamically retrieves relevant interview questions before each session using AI-assisted search.

The system analyzes publicly available interview experiences and technical interview discussions to build a customized interview scenario tailored to the user's selected role and difficulty.

This ensures that the interview experience reflects real-world interview practices instead of relying on static question banks.

---

### Continuous Structured Evaluation

Instead of only providing a final summary, the system continuously records evaluation events during the interview session.

These evaluations include:

• technical accuracy
• clarity of explanation
• reasoning quality
• communication effectiveness

---

### Post-Interview Feedback Dashboard

After the interview ends, users receive a structured feedback report summarizing their performance across different evaluation categories.

Users can also view historical interview sessions to track improvement over time.

---

## 5. System Architecture Overview

The platform consists of five major components.

### Frontend Application

A Next.js web application provides the user interface for:

• starting interviews
• streaming audio
• sharing screen content
• viewing analytics dashboards

The frontend manages the real-time connection to the Gemini Live API via WebSockets.

---

### AI Agent Layer

The core AI agent is powered by Gemini Live API using the Google GenAI SDK.

The agent performs:

• real-time voice conversation
• multimodal reasoning over screen frames
• tool calling for structured evaluations

---

### Question Discovery Engine

A lightweight AI-powered search module runs before the interview begins.

This module retrieves relevant interview questions from public sources and uses Gemini to summarize and structure them into a curated interview plan within approximately one minute.

---

### Backend Services

A Node.js backend deployed on Google Cloud Run manages:

• secure API endpoints
• session management
• tool call processing
• database writes

---

### Cloud Data Storage

Two Google Cloud services are used for persistence.

Firestore stores structured data including:

• user profiles
• interview sessions
• evaluation records
• generated interview question sets

Cloud Storage stores media assets such as:

• interview audio recordings
• generated feedback reports

---

## 6. Technology Stack

Frontend
Next.js
TypeScript
Tailwind CSS

AI Platform
Gemini Live API
Google GenAI SDK

Cloud Infrastructure
Google Cloud Run
Google Firestore
Google Cloud Storage

Communication
WebSockets for real-time streaming

---

## 7. Expected Outcomes

InterviewSense demonstrates how multimodal AI agents combined with dynamic knowledge retrieval can enable more realistic and adaptive interview preparation experiences.

The system highlights the potential of combining:

• real-time voice interaction
• visual understanding
• dynamic question discovery
• structured evaluation pipelines

to build intelligent coaching systems for technical professionals.

---

## 8. Key Learnings and Experimentation Goals

This project explores several emerging AI capabilities:

• real-time multimodal interaction with large language models
• AI-assisted discovery of domain-specific knowledge
• agent tool orchestration for structured evaluation
• integrating vision and speech in a live conversational system
• building cloud-based pipelines for AI-generated analytics

The implementation serves both as a functional prototype and as an exploration of how multimodal AI agents can assist with professional skill development while continuously adapting to evolving industry interview practices.
