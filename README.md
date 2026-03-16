# Skil-Ex2 Monorepo

Welcome to the **Skil-Ex2** monorepo, a modern skill-sharing platform built with a high-performance tech stack and a clean monorepo architecture. This project leverages **Turbo** for efficient task orchestration and **pnpm** for workspace management.

## 🚀 Tech Stack

### Core Architecture
- **Monorepo Manager**: [Turbo](https://turbo.build/)
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Shared Code**: Shared logic, types, and configurations in `/packages/shared`.

### Apps
- **[Next.js App (web)](./apps/web)**:
  - Framework: [Next.js 16 (app router)](https://nextjs.org/)
  - Styling: [Tailwind CSS 4](https://tailwindcss.com/)
  - UI Components: [Shadcn UI](https://ui.shadcn.com/)
  - Authentication: [Better-Auth](https://www.better-auth.com/)
  - Real-time Comms: [LiveKit](https://livekit.io/)
- **[NestJS API (api)](./apps/api)**:
  - Framework: [NestJS](https://nestjs.com/)
  - Database: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
  - Authentication: [Better-Auth](https://www.better-auth.com/)
  - Emails: [Resend](https://resend.com/)

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v20+)
- pnpm (v9+)
- PostgreSQL instance

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd skil-ex2
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in `apps/api` and `apps/web`.
   - Fill in the required secrets (LiveKit keys, Resend API key, Better Auth secrets, etc.).

### Development

Run all applications in development mode using Turbo:

```bash
pnpm dev
```

This will concurrently start the NestJS API and the Next.js Web app.

---

## 🏗️ Project Structure

```bash
skil-ex2/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── packages/
│   └── shared/       # Shared business logic and constants
├── turbo.json        # Turbo configuration
└── package.json      # Root dependencies and scripts
```

## 📜 Available Scripts

- `pnpm dev`: Start all apps in watch mode.
- `pnpm build`: Build all apps for production.
- `pnpm lint`: Run linting across all packages.
