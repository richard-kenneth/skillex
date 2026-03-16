# Skil-Ex2 Web App

The primary frontend for Skil-Ex2, built with [Next.js](https://nextjs.org/) and [Tailwind CSS](https://tailwindcss.com/).

## 🛠️ Core Technologies

- **Next.js 16**: Utilizing the latest App Router and Server Actions.
- **Tailwind CSS 4**: Modern, high-performance styling.
- **Better-Auth Client**: Seamless authentication integration.
- **Shadcn UI**: Beautiful, accessible, and customizable UI components.
- **LiveKit Components**: Real-time communication UI for skill-sharing sessions.
- **Sonner**: Toast notifications for user feedback.

## 🚀 Getting Started

### Environment Variables

Create a `.env` file in this directory and provide the following:

```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:3001"
NEXT_PUBLIC_CLIENT_BASE_URL="http://localhost:3000"
```

### Installation

1. Install dependencies (from root or this directory):
   ```bash
   pnpm install
   ```

## 🏗️ UI & Auth Flow

The web app includes several advanced authentication features:
- **Social Login**: Support for Google and LinkedIn via a shared `SocialLogins` component.
- **Email Verification**: Forced verification before access. Includes a "Check your email" success state and a resend option on sign-in.
- **Password Reset**: Full forgot password and reset password flows.

## 📜 Development Scripts

- `pnpm dev`: Start Next.js in development mode.
- `pnpm build`: Create a production build.
- `pnpm start`: Start the production server.
- `pnpm lint`: Run ESLint.
