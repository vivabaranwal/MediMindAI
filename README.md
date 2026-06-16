# MediMind AI

> **Premium clinic workflow intelligence platform** — powered by AI, built for modern healthcare teams.

MediMind AI is **not** a patient-facing app. It is a clinical operations platform designed to streamline the workflow between reception, junior doctors, and senior doctors inside a clinic or hospital — with AI at every decision point.

---

## 🏥 What It Does

MediMind digitizes and intelligences the full patient lifecycle inside a clinic:

```
Reception → Patient Registration
         → Junior Doctor Assessment (AI Dynamic Questioning)
         → AI Clinical Summary
         → Senior Doctor Review (AI Recommendations)
         → Doctor Decision → SOAP Note Generation
         → Prescription → Follow-up Planning
```

Every stage is powered by AI — from adaptive questioning to differential diagnosis recommendations to SOAP note generation.

---

## 🧑‍💼 Three Separate Role Dashboards

| Role | Access | Key Responsibilities |
|------|--------|----------------------|
| **Reception** | `/reception/*` | Patient registration, search, profile view, forward to junior doctor |
| **Junior Doctor** | `/junior-doctor/*` | AI-guided patient assessment, dynamic questioning, summary review, case forwarding |
| **Senior Doctor** | `/senior-doctor/*` | Clinical review, AI recommendations, SOAP authoring, prescription, follow-up |

Each dashboard has its own login, layout, navigation, and component set. Role isolation is enforced from the router level.

---

## 🗂️ Project Structure

```
medimind-dev-plan/
├── frontend/                   # Next.js 14 frontend (TypeScript + Tailwind)
│   ├── app/
│   │   ├── (auth)/             # Login pages for all roles
│   │   ├── reception/          # Reception dashboard & pages
│   │   ├── junior-doctor/      # Junior doctor dashboard & pages
│   │   ├── senior-doctor/      # Senior doctor dashboard & pages
│   │   ├── admin/              # Admin panel (placeholder)
│   │   ├── layout.tsx          # Root layout with global providers
│   │   ├── page.tsx            # Landing / role selection page
│   │   └── globals.css         # Design system tokens & global styles
│   ├── components/
│   │   ├── ui/                 # Shared UI library (Button, Card, Modal, etc.)
│   │   ├── junior-doctor/      # Junior doctor-specific components
│   │   └── senior-doctor/      # Senior doctor-specific components
│   ├── services/               # API service layer (Axios-based)
│   ├── store/                  # Zustand global state stores
│   ├── types/                  # TypeScript domain interfaces
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utility libraries
│   └── utils/                  # Helper functions
│
├── backend/                    # Backend (Clean Architecture scaffold)
│   ├── domain/                 # Entities, value objects, domain events
│   ├── application/            # Use cases, application services
│   ├── infrastructure/         # DB, external APIs, AI integrations
│   ├── presentation/           # API controllers, routes, middleware
│   ├── shared/                 # Shared utilities, constants, exceptions
│   └── tests/                  # Unit and integration tests
│
└── .gitignore                  # Excludes .dev/, node_modules, build, env files
```

> **Note:** The `.dev/` folder contains private planning documents, architecture specs, and development artifacts. It is excluded from this repository via `.gitignore`.

---

## 🛠️ Tech Stack

### Frontend
| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Forms | React Hook Form + Zod |
| HTTP Client | Axios |
| Icons | Lucide React |

### Backend *(in progress)*
| Layer | Technology |
|-------|------------|
| Primary API | FastAPI (Python) |
| Auth / BFF | Laravel (PHP) |
| AI Agents | LangGraph |
| Database | PostgreSQL |
| ORM | SQLAlchemy / Eloquent |
| Containerization | Docker + Docker Compose |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at **http://localhost:3000**

### Available Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page — role selection |
| `/reception` | Reception dashboard |
| `/reception/register` | New patient registration |
| `/reception/search` | Patient search |
| `/reception/patient/[id]` | Patient profile view |
| `/junior-doctor` | Junior doctor dashboard |
| `/junior-doctor/queue` | Patient queue |
| `/junior-doctor/patient/[id]/assessment` | AI assessment workspace |
| `/junior-doctor/patient/[id]/questions` | Dynamic AI questions |
| `/junior-doctor/patient/[id]/summary` | AI clinical summary |
| `/senior-doctor` | Senior doctor dashboard |
| `/senior-doctor/queue` | Case review queue |
| `/senior-doctor/patient/[id]/clinical-review` | AI-assisted clinical review |
| `/senior-doctor/patient/[id]/soap` | SOAP note editor |
| `/senior-doctor/patient/[id]/prescription` | Prescription builder |
| `/senior-doctor/patient/[id]/followup` | Follow-up planner |

---

## 🎨 Design System

MediMind uses a premium clinical aesthetic — dark, authoritative, and precise.

- **Color Palette:** Deep navy backgrounds, teal/cyan accents, clinical white text
- **Typography:** Geist (sans + mono) for clean medical readability
- **Components:** Fully custom UI library — no third-party component framework
- **Animations:** Subtle micro-animations for professional feel
- **Density:** Information-dense layouts suited to clinical workflows

---

## 🤖 AI Features (Planned Integration)

- **Dynamic Questioning Engine** — AI generates contextual follow-up questions based on patient answers in real time
- **Clinical Summary Generation** — AI synthesizes assessment data into structured clinical summaries
- **Differential Diagnosis Support** — AI provides ranked differentials with evidence references
- **SOAP Note Generation** — AI drafts SOAP notes from structured encounter data
- **Similar Case Matching** — AI surfaces historically similar cases for reference
- **Prescription Validation** — AI flags potential drug interactions and contraindications

---

## 📋 Development Status

| Module | Status |
|--------|--------|
| Project Structure & Architecture | ✅ Complete |
| Design System & UI Library | ✅ Complete |
| Reception Dashboard | ✅ Complete |
| Junior Doctor Dashboard | ✅ Complete |
| Senior Doctor Dashboard | ✅ Complete |
| Backend API (FastAPI) | 🔄 In Progress |
| AI Agent Integration (LangGraph) | 🔄 Planned |
| Authentication & Auth Guards | 🔄 Planned |
| Database Schema & Migrations | 🔄 Planned |
| Docker Dev Environment | 🔄 Planned |

---

## 👥 Contributing

This is a private development project. Architecture decisions and sprint planning live in the `.dev/` folder (not committed to this repo).

---

## 📄 License

Private — All rights reserved.
