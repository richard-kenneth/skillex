# Task Progress - Mobile App Fixes

## Completed ✅

### 1. Scrollability & Keyboard Issues

- [x] Global `KeyboardAvoidingView` added to root `_layout.tsx`
- [x] All auth screens: `flexGrow: 1` on ScrollView containers
- [x] All auth screens: `keyboardShouldPersistTaps="handled"`
- [x] Profile screen: `keyboardShouldPersistTaps="handled"`

### 2. Password Visibility Toggle

- [x] sign-in.tsx, sign-up.tsx, reset-password.tsx

### 3. Theme Toggle (Production Build)

- [x] Created `theme-context.tsx` with localStorage persistence
- [x] Wired up appearance chips in profile
- [x] Removed "disabled in preview build" message

### 4. App Metadata & Icons

- [x] App name: "Skil-Ex", bundle ID: "com.skil_ex"
- [x] App icon SVG matches web design
- [x] iOS and Android configurations updated
- [x] `generate-icons.js` script for PNG generation

### 5. Other User Profile

- [x] Message button shows "coming soon" toast

### 6. Exchange Screen

- [x] Functional chat body with API integration
- [x] Review submission with rating, comment, tags
- [x] Session management

### 7. Notifications

- [x] Delete refetches notification list
- [x] Mark all read works
- [x] Individual mark as read/delete works

### 8. Room Screen

- [x] Chat functionality (send/read/scroll)
- [x] Recording state machine
- [x] End session flow with confirmation
- [x] KeyboardAvoidingView present

### 9. Toast z-index Fix

- [x] Wrapped ToastStack in Modal with StatusBar
- [x] Toast now appears above dialogs

### 10. ActionSheet Improvements

- [x] Added StatusBar with translucent background
- [x] Added elevation (24) and shadow

### 11. Select Fields Display Issue (FIXED)

- [x] Replaced ActionSheet-based SelectField with inline dropdown
- [x] No more nested Modal issues inside Dialogs
- [x] Scrollable options list with maxHeight: 240
- [x] Chevron icon rotates when open
- [x] Check mark next to selected option
- [x] Works inside Dialogs and on regular screens

### 12. Push Notifications (FULL IMPLEMENTATION)

- [x] Added `PushToken` model to Prisma schema
- [x] Created API endpoints: POST `/notifications/push-token`, DELETE `/notifications/push-token`
- [x] Added `sendMobilePush()` method using Expo push API
- [x] Updated `createNotification()` to send mobile push alongside web push
- [x] Created shared notification abstraction in `packages/shared/src/notifications/`
- [x] Mobile uses shared client via `@skil-ex2/shared`
- [x] SSE for real-time notifications on mobile (mirrors web)
- [x] Proper authentication headers using `authClient.getSession()`
- [x] Android notification channels (default, exchanges, points, sessions)

### 13. Notification Preferences

- [x] Updated `NotificationPreferences` type to include `channels` property
- [x] Profile screen has toggles for in-app, push, and email channels
- [x] Master toggle for all notifications

### 14. Exchange Request UI

- [x] Added "Accept current terms" button matching web
- [x] Added `amIAgreed` and `acceptLoading` props
- [x] Insufficient points warning

## Remaining Items

- [ ] Exchange request UI redesign to match web (minor layout/spacing tweaks)
- [ ] Negotiations page completion (counter-offer flow, proposed slots display)
- [ ] Review submission flow testing
- [ ] Skills not fetched on other user profile (API dependent)
- [ ] PNG icon generation (run `node generate-icons.js` after `npm install sharp`)
- [ ] Run `npx prisma migrate dev --name add-push-token` and `npx prisma generate`
- [ ] Install `react-native-sse` in mobile if not already installed
