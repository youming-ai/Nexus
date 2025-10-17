# 🚀 Nexus

<div align="center">
  <img src="https://ik.imagekit.io/1winv85cn8g/VeloKit/authentication-overview_QRh-LC6Nr.png?updatedAt=1749458893183" alt="Next.js Authentication Overview" />
  <p><em>Full-stack starter kit with authentication, database, and modern UI</em></p>
  
  <p>
    <a href="#-features">Features</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-project-structure">Structure</a> •
    <a href="#-deployment">Deployment</a>
  </p>
</div>

---

## 📋 Overview

Nexus is a production-ready, full-stack monorepo starter kit that provides everything you need to build modern web applications. It combines the power of Next.js 15, Supabase authentication, Prisma ORM, and a beautiful UI powered by Tailwind CSS v4 and shadcn/ui.

### Key Highlights

- 🔐 **Complete Authentication System** - Email/password auth with Supabase
- 🎨 **Modern UI Components** - Pre-configured shadcn/ui with Tailwind CSS v4
- 📦 **Monorepo Architecture** - Organized with Turborepo for scalability
- 🗄️ **Type-safe Database** - Prisma ORM with PostgreSQL (Supabase)
- 🌙 **Dark Mode** - Built-in theme switching
- 🛡️ **Security First** - Row Level Security (RLS) policies configured
- 🚀 **Production Ready** - TypeScript, ESLint, Prettier pre-configured

---

## ✨ Features

### Authentication & Authorization
- ✅ Email/password authentication
- ✅ Forgot password flow
- ✅ Email confirmation
- ✅ Protected routes with middleware
- ✅ Session management
- ✅ Supabase Row Level Security (RLS)

### Developer Experience
- ✅ TypeScript throughout
- ✅ Hot Module Replacement
- ✅ Shared component library
- ✅ Consistent code style (ESLint + Prettier)
- ✅ Git hooks with Husky
- ✅ Turborepo for fast builds

### UI/UX
- ✅ Responsive design
- ✅ Dark/light mode
- ✅ Loading states
- ✅ Error boundaries
- ✅ Modern landing page
- ✅ Form validation with Zod

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **UI Library** | [shadcn/ui](https://ui.shadcn.com/) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) via [Supabase](https://supabase.com/) |
| **ORM** | [Prisma](https://www.prisma.io/) |
| **Authentication** | [Supabase Auth](https://supabase.com/docs/guides/auth) |
| **Package Manager** | [pnpm](https://pnpm.io/) |
| **Monorepo Tool** | [Turborepo](https://turbo.build/) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## ⚡ Getting Started

### Prerequisites

- **Node.js** >= 22.16.0
- **pnpm** >= 10.12.2 ([install guide](https://pnpm.io/installation))
- **Supabase** account ([sign up](https://supabase.com/))
- **Git**

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/youming-ai/nexus.git
cd nexus

# Install dependencies
pnpm install
```

### 2. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com/)

2. Run the SQL scripts in your Supabase SQL editor in this order:
   ```sql
   -- 1. First, run all files in packages/db/supabase/functions/
   -- 2. Then, run all files in packages/db/supabase/rls/
   -- 3. Finally, run all files in packages/db/supabase/triggers/
   ```

3. Configure email templates:
   - Go to [Auth templates](https://supabase.com/dashboard/project/_/auth/templates) in your dashboard
   - In the **Confirm signup** template, change:
     ```
     {{ .ConfirmationURL }}
     ```
     to:
     ```
     {{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=email
     ```

### 3. Environment Variables

Create `.env.local` in the `apps/web` directory:

```bash
cd apps/web
cp .env.example .env.local
```

Add your environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Database (for Prisma)
DATABASE_URL=your_supabase_database_url
DIRECT_URL=your_supabase_direct_url
```

> 💡 Find these values in your Supabase project settings under **Settings > API** and **Settings > Database**

### 4. Set up the database

```bash
# Generate Prisma client
pnpm --filter @workspace/db db:generate

# Run migrations (if any)
pnpm --filter @workspace/db db:push
```

### 5. Start development

```bash
# Start all apps and packages
pnpm dev

# Or start specific workspace
pnpm --filter web dev
```

Your app will be available at:
- 🌐 Web app: [http://localhost:3000](http://localhost:3000)

---

## 🏗 Project Structure

```
nexus/
├── apps/
│   └── web/                    # Next.js web application
│       ├── app/                # App router pages and API routes
│       ├── components/         # App-specific components
│       ├── config/            # App configuration
│       ├── lib/               # Utilities and libraries
│       ├── modules/           # Feature modules
│       ├── public/            # Static assets
│       └── utils/             # Helper functions
├── packages/
│   ├── db/                    # Database package
│   │   ├── prisma/            # Prisma schema and migrations
│   │   └── supabase/          # Supabase SQL scripts
│   ├── ui/                    # Shared UI component library
│   │   └── src/components/    # Reusable components
│   ├── eslint-config/         # Shared ESLint configuration
│   └── typescript-config/     # Shared TypeScript configuration
├── turbo.json                 # Turborepo configuration
└── pnpm-workspace.yaml        # pnpm workspace configuration
```

### Key Directories

- **`apps/web`** - Main Next.js application with authentication flows
- **`packages/db`** - Database schema, migrations, and RLS policies
- **`packages/ui`** - Shared component library using shadcn/ui
- **`apps/web/modules`** - Feature-based modules (landing, users)
- **`apps/web/lib/dal`** - Data Access Layer for database operations

---

## 📝 Available Scripts

### Root level commands

```bash
# Development
pnpm dev          # Start all packages in development mode
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm format       # Format code with Prettier

# Database
pnpm --filter @workspace/db db:generate  # Generate Prisma client
pnpm --filter @workspace/db db:push      # Push schema changes
pnpm --filter @workspace/db db:studio    # Open Prisma Studio

# Add UI components
pnpm --filter web dlx shadcn@latest add [component-name]
```

### Web app specific

```bash
cd apps/web
pnpm dev          # Start development server with Turbopack
pnpm build        # Create production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript compiler check
```

---

## 🔐 Authentication Flow

Nexus implements a complete authentication system:

1. **Sign Up** → Email confirmation → Redirect to login
2. **Sign In** → Session created → Redirect to dashboard
3. **Protected Routes** → Middleware checks → Access granted/denied
4. **Password Reset** → Email sent → Reset form → Success

The authentication is handled by Supabase Auth with custom middleware for session management.

---

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub

2. Import your repository on [Vercel](https://vercel.com/new)

3. Configure environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   DATABASE_URL
   DIRECT_URL
   ```

4. Deploy! 🎉

### Deploy to other platforms

The project can be deployed to any platform that supports Node.js:

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) team for the amazing framework
- [Supabase](https://supabase.com/) for the authentication and database
- [shadcn](https://twitter.com/shadcn) for the beautiful UI components
- [Vercel](https://vercel.com/) for hosting and deployment

---

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/youming-ai">youming-ai</a></p>
</div>
