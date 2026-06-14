# EU-DOC - Certificate Library Platform

A modern European certificate library platform built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🔍 **Multi-dimensional search** — Search by certified type, category, or company
- 🌍 **Internationalization** — Chinese and English (extensible to more languages)
- 🌙 **Dark mode** — System/light/dark theme support
- 📱 **Responsive design** — Works on all devices
- 🔐 **User authentication** — Registration, login, password reset
- ❤️ **Favorites** — Save and manage certificates
- 📄 **Certificate details** — Full certificate information view
- 🎨 **Modern UI** — Clean, professional design with shadcn/ui

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: NextAuth.js
- **i18n**: next-intl

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database credentials

# Push database schema
npx drizzle-kit push

# Start development server
npm run dev
```

### Deployment

See `deploy.sh` for deployment instructions.

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── [locale]/     # Internationalized routes
│   └── api/          # API routes
├── components/       # React components
│   ├── ui/           # shadcn/ui components
│   ├── layout/       # Layout components
│   ├── search/       # Search components
│   └── cert/         # Certificate components
├── db/               # Database schema & connection
├── i18n/             # Internationalization config
├── lib/              # Utility functions
├── store/            # Zustand state management
└── types/            # TypeScript types
```

## License

©2024 EU-DOC. All rights reserved.
