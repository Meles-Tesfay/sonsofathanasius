# Sons of Athanasius (ደቂቀ አትናቴዎስ) — Digital Library & Apologetics Platform

**Official Web Platform**: [https://www.sonsofathanasius.com/](https://www.sonsofathanasius.com/)  
**Primary Locale**: Amharic (`am`) | **Supported Locales**: English (`en`), Afaan Oromoo (`om`), Tigrigna (`ti`)  
**Target Hosting**: Yegara Host (DirectAdmin / cPanel Node 22 + MariaDB)

---

## 1. Overview & Vision

**Sons of Athanasius** (`ደቂቀ አትናቴዎስ`) is a multi-lingual, high-performance digital library and apologetics resource for the **Ethiopian Orthodox Tewahedo Church (EOTC)**. The platform provides biblically, historically, and patristically grounded answers to objections, facilitates interfaith dialogue, documents conversion testimonies, and enriches believers through deep theological and spiritual studies.

### Core 5 Knowledge Pillars (Categories):
1. **በእንተ ክርስትና (`christianity`)**: Christology, deity of Christ, Trinity, scriptural consistency, and patristics.
2. **በእንተ እስልምና (`islamic`)**: Interfaith theological dialogues, historical inquiry, and scriptural analysis.
3. **ምስክርነቶች (`testimonies`)**: Conversion and spiritual transformation journeys.
4. **በእንተ ኢ-አማኒነት (`atheism`)**: Orthodox Christian philosophical responses to secularism and materialism.
5. **መንፈሳዊ ትምህርቶች (`spiritual-teachings`)**: Orthodox spirituality, asceticism, liturgy, and Christian living.

---

## 2. Monorepo Architecture & Tech Stack

```
sons-of-athanasius/
├── client/                     # Vite 8 + React 19 + TypeScript Frontend
│   ├── public/                 # Favicons, logo SVGs, static assets
│   ├── src/
│   │   ├── assets/             # Branding graphics, icons
│   │   ├── components/         # Reusable UI components
│   │   │   ├── common/         # Button, Card, Modal, Drawer, Input (Shadcn UI)
│   │   │   ├── layout/         # Header, Navbar, Footer, MobileDrawer (80vw)
│   │   │   ├── article/        # ScriptureTooltip ([data-ref]), MediaEmbed, PDFDownloadBtn
│   │   │   ├── editor/         # TipTapEditor (Admin with custom citation node)
│   │   │   ├── audio/          # GlobalAudioPlayer, AudioProgressBar
│   │   │   └── search/         # SearchModal (Cmd+K), SearchResultItem
│   │   ├── hooks/              # useArticles, useAudio, useLanguage, useSearch
│   │   ├── locales/            # am.json, en.json, om.json, ti.json
│   │   ├── pages/              # Home, CategoryPage, ArticleDetail, About, Contact, Admin
│   │   ├── services/           # Axios/Fetch API client
│   │   ├── types/              # TypeScript interfaces (Article, Category, Media, Tag)
│   │   ├── utils/              # Scripture parser, date formatters, slug helpers
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css           # Tailwind v4 theme & font imports
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts          # @tailwindcss/vite + @vitejs/plugin-react
│
├── server/                     # Express 5 + TypeScript Backend
│   ├── src/
│   │   ├── config/             # App & environment configuration
│   │   ├── db/                 # Drizzle connection & schema
│   │   │   ├── schema.ts       # MariaDB / MySQL table definitions
│   │   │   ├── index.ts        # Database connection pool (mysql2)
│   │   │   └── seed.ts         # Seeding for 5 categories & tags
│   │   ├── cache/              # LRU-Cache configuration & helpers
│   │   ├── controllers/        # Article, Category, Search, PDF, Contact controllers
│   │   ├── middleware/         # Error handler, rate limit, CORS, cache middleware
│   │   ├── routes/             # Express 5 API routes (/api/v1/...)
│   │   ├── services/           # PDFKit service (Static TTF + NFC), Search service
│   │   ├── types/              # Request/Response TypeScript DTOs
│   │   └── index.ts            # Server entrypoint
│   ├── drizzle/                # Generated SQL migration files
│   ├── drizzle.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI PR validation (actions/checkout@v7, setup-node@v7)
│       └── deploy.yml          # Automated FTP deployment to Yegara (FTP-Deploy@v4.4.0)
│
├── .gitignore
├── README.md
└── package.json                # Root npm workspaces config
```

### Verified 2026 Technology Stack:
- **Frontend**: Vite 8 (Rolldown), React 19.2+, TypeScript ~6.0.3, Tailwind CSS v4 (`@tailwindcss/vite`), Motion 13 (`motion/react`), Lucide React, TipTap 3.30.1, i18next.
- **Backend**: Express 5.2, Node.js 22 LTS, Drizzle ORM 0.45.x, `mysql2`, Zod 4, LRU-Cache 11.5.2, PDFKit 0.19.1, Sanitize-HTML 2.17, MiniSearch.
- **Database**: MariaDB 10.11 LTS (`utf8mb4_unicode_520_ci`).

---

## 3. Getting Started & Development

### Prerequisites:
- Node.js `≥ 22.0.0`
- npm `≥ 10.0.0`
- MariaDB or MySQL database

### Installation:
```bash
# Clone the repository
git clone https://github.com/Zeathan/sons-of-athanasius.git
cd sons-of-athanasius

# Install dependencies for all workspaces
npm install
```

### Running Locally:
```bash
# Start frontend client (Vite)
npm run dev:client

# Start backend server (Express + tsx)
npm run dev:server

# Or start both simultaneously
npm run dev:all
```

### Building for Production:
```bash
npm run build
```

---

## 4. CI/CD & Deployment Strategy

- **Pull Requests**: Automated type-checking and build tests via `.github/workflows/ci.yml`.
- **Production Deployment**: Push to `main` triggers automated static build deployment to Yegara Host (`/public_html/`) via `.github/workflows/deploy.yml`.
