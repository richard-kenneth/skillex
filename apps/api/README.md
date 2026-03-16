# Skil-Ex2 API

This is the backend for the Skil-Ex2 platform, built with [NestJS](https://nestjs.com/). It provides a robust and scalable GraphQL/REST API to power the frontend.

## 🛠️ Core Technologies

- **NestJS**: A progressive Node.js framework for building efficient server-side applications.
- **Prisma**: Next-generation Node.js and TypeScript ORM for database access.
- **Better-Auth**: Secure and modular authentication with Prisma adapter.
- **Resend**: Transactional email API for verification and reset flows.
- **LiveKit Server SDK**: Handling real-time video/audio room management.

## 🚀 Getting Started

### Prerequisites
- PostgreSQL database
- Node.js and pnpm

### Environment Variables

Create a `.env` file in this directory and provide the following:

```env
PORT=3001
API_BASE_URL="http://localhost:3001"
CLIENT_BASE_URL="http://localhost:3000"

DATABASE_URL="postgresql://user:password@localhost:5432/skil_ex2"
BETTER_AUTH_SECRET="your-better-auth-secret"
JWT_SECRET="your-jwt-secret"

# OAuth Providers
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
LINKEDIN_CLIENT_ID="..."
LINKEDIN_CLIENT_SECRET="..."

# Email Provider (Resend)
RESEND_API_KEY="re_..."
ONBOARDING_EMAIL_FROM="onboarding@yourdomain.com"

# Video Conferencing (LiveKit)
LIVEKIT_API_KEY="..."
LIVEKIT_API_SECRET="..."
NEXT_PUBLIC_LIVEKIT_URL="wss://..."
```

### Installation & Initialization

1. Install dependencies (from root or this directory):
   ```bash
   pnpm install
   ```

2. Generate Prisma Client:
   ```bash
   pnpm prisma generate
   ```

3. Run migrations:
   ```bash
   pnpm prisma migrate dev
   ```

## 📜 Development Scripts

- `pnpm dev`: Start NestJS server in watch mode.
- `pnpm build`: Compile the application.
- `pnpm lint`: Run ESLint.
- `pnpm test`: Execute unit tests.
