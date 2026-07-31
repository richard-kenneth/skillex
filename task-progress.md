# Task Progress - Mobile App Fixes

## Completed ✅

### 1. Scrollability & Keyboard Issues

- [x] Global `KeyboardAvoidingView` added to root `_layout.tsx` - covers all screens
- [x] All auth screens: `flex: 1` → `flexGrow: 1` on ScrollView containers
- [x] All auth screens: `keyboardShouldPersistTaps="handled"` on ScrollViews
- [x] Profile screen: `keyboardShouldPersistTaps="handled"` on ScrollView

### 2. Password Visibility Toggle

- [x] sign-in.tsx: Eye/EyeOff toggle
- [x] sign-up.tsx: Eye/EyeOff toggle
- [x] reset-password.tsx: Eye/EyeOff toggles for both password fields

### 3. Theme Toggle (Production Build)

- [x] Created `theme-context.tsx` with localStorage persistence
- [x] Wired up System/Light/Dark chips in profile to actually toggle theme
- [x] Removed the "disabled in preview build" message

### 4. App Metadata & Icons

- [x] App name set to "Skil-Ex", bundle ID "com.skil-ex"
- [x] App icon updated to match web icon (brackets + exchange arrows SVG)
- [x] Splash screen configured

### 5. Other User Profile

- [x] Message button now shows "coming soon" toast

### 6. Exchange Screen

- [x] Functional chat body with message fetch/send via API

### 7. Notifications

- [x] Delete now refetches notification list
- [x] Mark all read works
- [x] Individual mark as read/delete works

### 8. Room Screen

- [x] Chat functionality implemented (send/read/scroll)
- [x] Recording state machine implemented (idle → requesting_consent → waiting → recording → processing)
- [x] End session flow with confirmation dialog
- [x] KeyboardAvoidingView already present

## Remaining Items (Minor/API Dependent)

- [ ] Review submission flow in exchanges (implementation complete, needs testing)
- [ ] Skills not fetched on other user profile (depends on API including `userSkills` relation)
