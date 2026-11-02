# SkillEx Shared Package

This package contains shared business logic, constants, and utilities used by both the `api` and `web` applications within the SkillEx monorepo.

## 📦 Contents

- **Constants**: Shared strings, error codes, and configuration values.
- **Utilities**: Helper functions that are environment-agnostic.
- **Types**: Shared TypeScript interfaces and types.

## 🚀 Usage

Since this is a workspace package, you can import it in other apps using:

```typescript
import { someConstant } from "@skillex/shared";
```

## 🛠️ Build & Development

This package currently exports source files directly to avoid complex build steps during early development. The `pnpm build` script is a placeholder.
