# 03. Architecture, Route Structure & Dashboards

This document details the software architecture, page routes, state management, and role-based workflows built into the **MediMind AI** Next.js 14 frontend.

---

## 🏗️ Software Architecture

MediMind AI is a Next.js 14 application using the **App Router** pattern. It separates layouts, routes, and styles based on user roles, ensuring clean code separation and access control.

```
frontend/
├── app/
│   ├── (auth)/             # Login routes per clinical role
│   ├── reception/          # Reception desk portal
│   ├── junior-doctor/      # Intake & assessment console
│   └── senior-doctor/      # Clinical review & prescription workspace
├── components/
│   ├── ui/                 # Core design system atomic elements (custom)
│   ├── junior-doctor/      # Junior doctor workspace-specific components
│   └── senior-doctor/      # Senior specialist workspace-specific components
├── store/                  # Zustand stores for global clinical state
└── services/               # Axios-based mock/API service integrations
```

---

## 🧭 Page Routes & Roles Map

The system separates views into three distinct roles, each isolated at the router and directory levels:

### 1. Reception Portal (`/reception`)
Designed for high-speed front-desk operations.
*   `/reception` — Active queue list and registration links.
*   `/reception/register` — New patient intake form.
*   `/reception/search` — Unified search across EMR records.
*   `/reception/patient/[id]` — Detailed profile tracker, diagnostic report upload (PDF/Images), consent signature, and queue routing button.

### 2. Junior Doctor Assessment Console (`/junior-doctor`)
A guided workspace for clinical intake and recording patient presentation.
*   `/junior-doctor` — Patient queue panel.
*   `/junior-doctor/patient/[id]` — Main workspace, showing EMR history, current vitals status, and intake timeline.
*   `/junior-doctor/patient/[id]/assessment` — Core intake page (Symptom logger + dynamic AI questioning).
*   `/junior-doctor/patient/[id]/questions` — Full screen view of AI follow-up questionnaires.
*   `/junior-doctor/patient/[id]/summary` — Pre-consultation clinical summary review before forwarding to the senior doctor.

### 3. Senior Doctor Workspace (`/senior-doctor`)
An information-dense clinical panel designed for specialists.
*   `/senior-doctor` — Case review list sorted by risk level.
*   `/senior-doctor/patient/[id]/clinical-review` — Central 3-column workspace. Integrates:
    *   **Patient Context Panel** (EMR History, Active Medications, Allergies)
    *   **Junior Intake Assessment** (Vitals, Chief Complaint, Completed Q&As)
    *   **AI Intelligence Panel** (Chatbot, Recommendations, Outcome stats, Similar cases)
    *   **SOAP Note Writer** (Subjective, Objective, Assessment, Plan editor)
    *   **Prescription Builder** (Searchable catalog + custom drug adder)
    *   **Follow-Up Planner** (Tracking outcomes & scheduling visits)

---

## ⚡ Global State Management (Zustand)

State is synchronized client-side using Zustand stores to allow real-time dashboard updates without page reloads.

### Junior Doctor Store (`juniorDoctorStore.ts`)
*   Manages the list of active assessment patients.
*   Stores temporal vitals state (BP, HR, Temp, SpO2) and dynamic question responses.
*   Handles forwarding actions, updating patient status from `"Registered"` ➔ `"In Assessment"` ➔ `"Completed"`.

### Senior Doctor Store (`seniorDoctorStore.ts`)
*   Tracks incoming cases in the specialist review queue.
*   Maintains draft states for SOAP notes, prescriptions, and follow-ups.
*   Coordinates signing events: when a doctor clicks *"Approve & Securely Sign"*, it locks the files and updates status to `"approved"`, which propagates visibility to the receptionist and junior doctor consoles.
*   Tracks accepted AI suggestions and logs custom medication catalogue entries.

---

## 🎨 Design System & Information Density

MediMind AI avoids standard off-the-shelf component libraries (like Shadcn or Material UI) in favor of a bespoke, clinical-grade UI engine defined in [globals.css](file:///c:/Users/Viva/Downloads/medimind-dev-plan/frontend/app/globals.css):

*   **Dark Modern Aesthetics:** Deep slate and navy foundations (`#0F172A`, `#1E293B`) paired with high-contrast clinical white text and cyan/teal accents.
*   **Aria Accordions & Drawers:** Micro-animations (fade-in, slide-up, collapse) provide clean transitions when opening reports or toggling questionnaires.
*   **Information Density:** Form inputs use small, uppercase tracking labels and compact typography (Geist Mono and Sans) to maximize visible data, helping doctors review complete histories without scrolling.
