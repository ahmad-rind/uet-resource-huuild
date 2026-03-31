
<div align="center">

# 📚 UET Taxila Resource Hub

**A student-built platform for sharing and discovering academic resources at UET Taxila.**
Past papers · Notes · Lab manuals · And more.

[![Live Demo](https://img.shields.io/badge/▶_Live_Demo-Visit_Site-2ea44f?style=for-the-badge&logo=vercel&logoColor=white)](https://uet-resource-huuild.vercel.app)

![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript_5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_7-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=flat-square&logo=framer&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

<br />

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" alt="divider" width="100%" />

</div>

<br />


## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Contributing](#-contributing)
- [License](#-license)

<br />

## 🔭 Overview

**UET Resource Hub** bridges the gap between students and academic materials at UET Taxila. Instead of hunting through WhatsApp groups and scattered Google Drive links, students can discover, share, and access curated resources — all in one place.

> Built by students, for students. Open source and community-driven.

<br />

## ✨ Features

<table>
<tr>
<td width="50%">

### 🎓 For Students
- **Browse** resources by department, semester, and course
- **Search** with full-text search across the entire catalog
- **Submit** your own notes, papers, and manuals for community use
- **Discover** materials curated and verified by admins

</td>
<td width="50%">

### 🛡️ For Admins
- **Dashboard** with comprehensive resource management
- **Approval workflow** — review and approve student submissions
- **Moderator management** — delegate responsibilities
- **Row-Level Security** enforced at the database level

</td>
</tr>
</table>

<br />

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│                                                         │
│   React 19 + TypeScript ──► Vite 7 ──► Vercel (CDN)    │
│   Tailwind CSS v4 + Framer Motion                       │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │  HTTPS / REST
                       ▼
┌─────────────────────────────────────────────────────────┐
│                     SUPABASE                            │
│                                                         │
│   ┌─────────────┐  ┌──────────┐  ┌──────────────────┐  │
│   │  PostgreSQL  │  │   Auth   │  │   RPC Functions  │  │
│   │  + RLS       │  │  (JWT)   │  │   (Business      │  │
│   │  Policies    │  │          │  │    Logic)        │  │
│   └─────────────┘  └──────────┘  └──────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

<br />

## 🛠 Tech Stack

| Layer        | Technology                          | Purpose                          |
| :----------- | :---------------------------------- | :------------------------------- |
| **Frontend** | React 19, TypeScript 5.9            | UI components & type safety      |
| **Build**    | Vite 7                              | Lightning-fast dev server & HMR  |
| **Styling**  | Tailwind CSS v4, Framer Motion      | Utility-first CSS & animations   |
| **Backend**  | Supabase (PostgreSQL, Auth, RPC)    | Database, auth & serverless APIs |
| **Hosting**  | Vercel                              | Edge deployment & CDN            |

<br />

## 🚀 Getting Started

### Prerequisites

| Requirement    | Version |
| :------------- | :------ |
| **Node.js**    | 18+     |
| **npm / pnpm** | Latest  |
| **Supabase**   | Any     |

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/ahmad-rind/uet-resource-huuild.git
cd uet-resource-huuild
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Configure Environment

```bash
cp .env.example .env
```

Fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4️⃣ Set Up the Database

Run the following SQL scripts in your **Supabase SQL Editor**, in order:

```
1. SUPABASE_SETUP.sql              → Core tables, RLS policies, and triggers
2. SUPABASE_CATEGORIES_SETUP.sql   → Department & course category seed data
3. STATS_OPTIMIZATION.sql          → Materialized views for dashboard stats
```

### 5️⃣ Launch Development Server

```bash
npm run dev
```

The app will be available at **`http://localhost:5173`**

<br />

## 📁 Project Structure

```
uet-resource-huuild/
│
├── public/                  # Static assets
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/              #   ├── Primitives (Button, Card, Input...)
│   │   ├── layout/          #   ├── Header, Footer, Sidebar
│   │   └── resource/        #   └── Resource-specific components
│   │
│   ├── pages/               # Route-level page components
│   │   ├── Home.tsx         #   ├── Landing page
│   │   ├── Browse.tsx       #   ├── Resource browser
│   │   └── admin/           #   └── Admin panel pages
│   │       ├── Dashboard.tsx
│   │       └── Submissions.tsx
│   │
│   ├── lib/                 # Supabase client & utility config
│   ├── data/                # Static course fallback data
│   └── App.tsx              # Root component & router
│
├── .env.example             # Environment variable template
├── SUPABASE_SETUP.sql       # Database schema
├── tailwind.config.ts       # Tailwind configuration
├── vite.config.ts           # Vite configuration
└── package.json
```

<br />

## 🔐 Environment Variables

| Variable                  | Required | Description                  |
| :------------------------ | :------: | :--------------------------- |
| `VITE_SUPABASE_URL`       |    ✅    | Your Supabase project URL    |
| `VITE_SUPABASE_ANON_KEY`  |    ✅    | Your Supabase anonymous key  |

> ⚠️ **Note:** Never commit your `.env` file. The `.gitignore` already excludes it.

<br />

## 🗄 Database Setup

The database layer uses **Supabase PostgreSQL** with Row-Level Security (RLS) enabled on all tables. The setup is split into three migration files for clarity:

| File                              | Description                                          |
| :-------------------------------- | :--------------------------------------------------- |
| `SUPABASE_SETUP.sql`             | Core schema — tables, RLS policies, triggers         |
| `SUPABASE_CATEGORIES_SETUP.sql`  | Seed data for departments, semesters, courses        |
| `STATS_OPTIMIZATION.sql`         | Materialized views & RPC functions for dashboard     |

<br />

## 🤝 Contributing

Contributions make the open-source community an incredible place to learn, inspire, and create. Any contribution you make is **greatly appreciated**.

1. **Fork** the repository
2. **Create** your feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit** your changes
   ```bash
   git commit -m "feat: add amazing feature"
   ```
4. **Push** to the branch
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open** a Pull Request

> 💡 For major changes, please [open an issue](https://github.com/ahmad-rind/uet-resource-huuild/issues) first to discuss what you would like to change.

<br />

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

<br />

---

<div align="center">

**Built with ❤️ by students of [UET Taxila](https://www.uettaxila.edu.pk/)**

[⬆ Back to Top](#-uet-taxila-resource-hub)

</div>
