# Software Portfolio

Last updated: 2026-03-26

## Profile

I build production-ready web, mobile, and AI-enabled applications. I focus on shipping complete systems: frontend UX, backend APIs, integrations, and operational flows.

## Portfolio Snapshot

- Active project window: 2025-08-22 to 2026-03-25
- Repositories analyzed: 13 (plus 1 local MAMP/CodeIgniter project)
- Total commits across analyzed repos: 605
- Primary stacks: Flutter/Dart, Next.js/TypeScript, FastAPI/Python, PHP (CodeIgniter), Android/Kotlin

## Featured Projects

### 1) LinkForex Platform (Admin + Mobile + Backend)

**Repositories**
- Admin (Next.js): https://github.com/HemalStewart/linkforex
- Backend (CodeIgniter): https://github.com/HemalStewart/linforex_backend
- Mobile app (Flutter): https://github.com/Dilmith-Ranasinghe518/LinkForexApp

**What I built**
- Admin workflows for remitters, receivers, transfers, branch access, permissions, reports, and mobile-user controls.
- Mobile money-transfer app with onboarding, KYC flow, beneficiary management, transfer/payment flows, OTP, and device verification.
- Backend integration-ready API structure with services/controllers/models.

**Evidence in code**
- Admin modules: `app/admin/*` (e.g., transfers, remitters, receivers, branch-access, reports)
- Mobile pages/services: `LinkForexApp/lib/pages/*`, `LinkForexApp/lib/services/*`
- Backend architecture: `linforex_backend_sync_20260315/app/{Controllers,Models,Services,Api}`

---

### 2) Zoom Clone (Next.js + TypeScript)

**Repository**
- https://github.com/HemalStewart/zoom-clone-main

**What I built**
- Zoom-style video conferencing app implementation with meeting lifecycle flows: new meeting, scheduled meetings, personal room, previous meetings, recordings, and join-by-link.
- Authentication integration and real-time meeting components for participant/session control.
- Responsive dashboard and meeting-room UX across auth/home/meeting routes.

**Key stack indicators**
- Next.js + TypeScript + Tailwind CSS
- Clerk auth (`@clerk/nextjs`)
- Stream video SDK (`@stream-io/video-react-sdk`, `@stream-io/node-sdk`)

**Evidence in repo**
- App routes: `app/(root)/(home)/*`, `app/(root)/meeting/[id]/page.tsx`
- Meeting components: `components/{MeetingRoom,MeetingSetup,MeetingModal,CallList,MeetingCard}.tsx`
- Stream integration: `providers/StreamClientProvider.tsx`, `actions/stream.actions.ts`
- Auth routes: `app/(auth)/sign-in/*`, `app/(auth)/sign-up/*`
- Package stack: `package.json`

---

### 3) WriteScan (Flutter App)

**Repository**
- https://github.com/shehan-077/Write-Scan---Flutter

**What I built**
- Mobile document-scanning and writing assistant app with OCR and document workflows.
- Multi-mode scanning flows (text extraction, handwriting scan, CSV scan, review/placeholder states).
- Auth + onboarding flow, documents/folders viewer, notifications, and shell navigation.
- AI chat features including general chat and bot-specific chat/create-bot flows.
- Local persistence and offline support via `sqflite` + local storage.

**Key stack indicators**
- Flutter + Riverpod + GoRouter
- ML Kit scanner + text recognition (`google_mlkit_document_scanner`, `google_mlkit_text_recognition`)
- AI integrations (`google_generative_ai`)
- PDF/export/share stack (`pdf`, `printing`, `share_plus`, `open_filex`)

**Evidence in code**
- Scan features: `writescan/lib/features/scan/view/*`
- Chat/bot features: `writescan/lib/features/general_chat/*`, `writescan/lib/features/bots/*`
- Routing and shell: `writescan/lib/routing/app_router.dart`, `writescan/lib/features/shell/view/app_shell.dart`
- Auth/data layers: `writescan/lib/features/auth/*`, `writescan/lib/data/*`
- Dependencies: `writescan/pubspec.yaml`

---

### 4) Edu AI Browser (Desktop Browser + AI Tutor)

**Repository**
- https://github.com/HemalStewart/edu-ai-browser

**What I built**
- Electron + Next.js browser workspace with side-by-side Library panel, Reader/Browser view, and AI Tutor panel.
- Integrated reading tools: summarize, explain, key points, flashcards, quiz generation, and page-context chat.
- Provider switch support for Gemini/OpenAI in the tutor workflow.
- Desktop-side managers for bookmarks, history, and settings persistence.

**Evidence in code**
- Monorepo/app layout: `edu-ai-browser/apps/{desktop,renderer}`
- Reader + orchestration UI: `edu-ai-browser/apps/renderer/src/app/page.tsx`, `edu-ai-browser/apps/renderer/src/components/workspace-layout.tsx`
- AI tutor features: `edu-ai-browser/apps/renderer/src/components/ai-tutor/ai-tutor-panel.tsx`
- Library/history/bookmarks/settings: `edu-ai-browser/apps/renderer/src/components/library/library-panel.tsx`, `edu-ai-browser/apps/renderer/src/components/views/*`
- Desktop managers: `edu-ai-browser/apps/desktop/src/managers/{history,bookmarks,settings}.ts`
- Workspace config/dev orchestration: `edu-ai-browser/pnpm-workspace.yaml`, `edu-ai-browser/package.json`

---

### 5) PDMS (Local MAMP Project)

**Project location**
- `/Applications/MAMP/htdocs/pdms`

**What I found**
- PHP CodeIgniter HMVC project with `application/modules/*` architecture.
- Product/docs identify it as **Global - Multi School Management System Express (GMSMS) v5.2**.
- Includes core modules for academic, attendance, exam, library, HRM, accounting, payroll, transport, hostel, frontoffice, announcements, events, reports, messaging, and settings.
- Includes public-facing web routes (`about`, `news`, `notice`, `events`, `contact`, `admission-online`, etc.) and login/reset flows.

**Evidence in code**
- Modules: `pdms/application/modules/*`
- Controllers/models: `pdms/application/controllers/*`, `pdms/application/models/*`
- Routing: `pdms/application/config/routes.php`
- ACL/permissions config: `pdms/application/config/custom.php`
- Schema and upgrades: `pdms/documentation/database/database.sql`, `pdms/documentation/UPDATE for */*.sql`

---

### 6) Smart Guardian Pro (Flutter Safety App)

**Repository**
- https://github.com/shehan-077/Smart-Guardian-Pro

**What I built**
- Safety-focused mobile product with SOS flows, live/location services, nexus/group features, subscription gates, and notification channels.
- Multi-screen architecture with modular service layer for auth, location, SOS, purchases, and session handling.

**Evidence in code**
- Screens: `smart_guardian_pro/lib/screens/*`
- Services: `smart_guardian_pro/lib/services/*`
- Models/widgets: `smart_guardian_pro/lib/models/*`, `smart_guardian_pro/lib/widgets/*`

---

### 7) ChatSoulAI (Flutter AI Social/Chat Product)

**Repository**
- https://github.com/shehan-077/ChatSoulAi---Flutter

**What I built**
- End-to-end app flows: auth (email/login/register/OTP), chat/discover/match/wallet/subscription/create flows, referrals, ads, and content generation features.
- Structured feature modules and reusable core/data layers.

**Evidence in code**
- Features: `chatsoulai/lib/src/features/*`
- Core utilities/router/theme: `chatsoulai/lib/src/core/*`
- Data services: `chatsoulai/lib/src/data/*`

---

### 8) PDF LLM Trainer / RAG System

**Repository**
- Local repo analyzed: `/Users/lakminiinternational/rag-system`

**What I built**
- RAG-style architecture with FastAPI backend + Next.js frontend for uploading PDFs, indexing, retrieval, and chat/search experience.
- Pipeline components for chunking, embeddings, vector store, retriever/reranker, prompt building, and API routes.

**Evidence in code**
- Backend services: `rag-system/backend/app/services/*`
- API routes: `rag-system/backend/app/api/*`
- Workers/pipeline: `rag-system/backend/app/workers/*`
- Frontend pages/components: `rag-system/frontend/app/{upload,chat}`, `rag-system/frontend/components/*`

---

### 9) Chat Bot Web App (Next.js + AI Providers)

**Repository**
- https://github.com/HemalStewart/chat-bot

**What I built**
- AI chat application with API routes, OCR ingestion, model routing, multi-provider support (OpenAI + Gemini), and Prisma-backed data layer.

**Evidence in code**
- API routes: `chat-bot/app/api/{chat,context,papers,models}/route.ts`
- AI providers/router: `chat-bot/lib/ai/providers/*`, `chat-bot/lib/ai/router.ts`
- OCR + DB layer: `chat-bot/lib/ocr/*`, `chat-bot/lib/db/*`

## Additional Projects

- WriteScan (Flutter): https://github.com/shehan-077/Write-Scan---Flutter
- Flicky (Flutter): https://github.com/HemalStewart/flicky
- WriteScan Android variants (Kotlin): local Android Studio repos analyzed
- PDMS / GMSMS (CodeIgniter, local MAMP): `/Applications/MAMP/htdocs/pdms`
- Zoom Clone (Next.js): https://github.com/HemalStewart/zoom-clone-main

## Core Strengths

- Full-stack delivery across web, mobile, backend, and AI integrations
- Fast iteration while preserving repo hygiene and production structure
- Complex form/process flows (KYC, onboarding, verification, branch access, transfer operations)
- Service-oriented architecture in Flutter and API-centric design in web/backend systems

## Ready-to-Use Bio (Short)

Full-stack engineer specializing in Flutter, Next.js, and backend APIs. Built and iterated multiple production-style platforms including fintech transfer systems, communication platforms, safety/location apps, and document-RAG systems.
