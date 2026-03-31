# 📚 UET Taxila Resource Hub

A student-built platform for sharing and discovering academic resources at UET Taxila — past papers, notes, lab manuals, and more.

🌐 **Live Demo**: https://uet-resource-huuild.vercel.app

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, TypeScript 5.9 |
| Styling | Tailwind CSS v4, Framer Motion |
| Backend | Supabase (PostgreSQL, Auth, RPC) |
| Hosting | Vercel |

---

## ✨ Features

- Browse resources by department, semester, and course
- Full-text search across all resources
- Submit resources for admin approval
- Admin dashboard with moderator management
- Secure Row-Level Security enforced at DB level

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project

### 1. Clone the repository
```bash
git clone https://github.com/ahmad-rind/uet-resource-huuild.git
cd uet-resource-huuild
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Copy the example env file and fill in your Supabase credentials:
```bash
cp .env.example .env
```
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Set up the database
Run the SQL scripts in your Supabase SQL editor in this order:
1. `SUPABASE_SETUP.sql`
2. `SUPABASE_CATEGORIES_SETUP.sql`
3. `STATS_OPTIMIZATION.sql`

### 5. Start development server
```bash
npm run dev
```

---

## 📁 Project Structure
src/
├── components/     # Reusable UI components
├── pages/          # Route-level page components
│   └── admin/      # Admin panel pages
├── lib/            # Supabase client config
└── data/           # Static course fallback data

---

## 🔐 Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first.

---

## 📄 License

MIT
