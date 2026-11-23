# Demo capture guide

The README currently uses the social preview as its banner. It still needs a real
screenshot or short GIF captured from the running app. This guide defines the
shots, capture settings, privacy checks, and file sizes so the demo asset is
useful and safe to publish.

Do not fake a screenshot, reuse a competitor's UI, or capture production data.
If the local stack cannot run, the demo asset is not ready; it is a launch gate,
not a design task.

## Preconditions

- The local stack runs with `pnpm run setup` and `pnpm dev`.
- The database is seeded with the demo data.
- The web app is at <http://localhost:3000> with prelaunch mode off for the
  marketplace pages.
- The browser is a clean profile with no extensions, bookmarks, or notifications.
- The viewport is 1440×900 at 100% zoom.
- The demo account is `demo@skillex.dev` with password `Password123!`.
- LiveKit is either configured for a local test room or omitted from the
  storyboard. Do not stage a fake call.

## Privacy checklist

Before capturing, confirm:

- [ ] Only seeded demo accounts and data are visible.
- [ ] No real email addresses, names, avatars, or phone numbers are visible.
- [ ] No `.env` contents, API keys, tokens, cookies, or authorization headers are
      visible.
- [ ] No production URLs, internal hostnames, or provider dashboards are visible.
- [ ] Browser devtools, the network panel, and the extensions bar are closed.
- [ ] The waitlist form is not submitted with a real email address.
- [ ] Any third-party avatar or profile is replaced with demo data.
- [ ] The recording is reviewed frame by frame before it is committed.

If a frame contains something that should not be public, delete the recording and
start again. Do not blur a secret and hope it is unreadable.

## Storyboard

Aim for 12–15 seconds and six shots. Each shot should be long enough to read
without feeling slow.

| Shot | Screen                             | Action                                                     | Duration |
| ---- | ---------------------------------- | ---------------------------------------------------------- | -------- |
| 1    | Landing page                       | Show the hero, the one-line pitch, and the waitlist button | 2s       |
| 2    | Sign-in                            | Sign in with the demo account                              | 2s       |
| 3    | Skills or matches                  | Filter or browse skills; show a complementary match        | 3s       |
| 4    | Exchange request                   | Show the points breakdown and submit a request             | 3s       |
| 5    | Live session room (optional)       | Show the room, chat, and screen-share controls             | 3s       |
| 6    | Profile, reviews, or points wallet | End on reputation or the points balance                    | 2s       |

If LiveKit is not configured, skip shot 5. A five-shot GIF is better than a fake
call. Use a static screenshot for the live-session feature and label it as
optional in the README.

## Capture settings

- **Resolution:** 1440×900, 100% zoom.
- **Frame rate:** 30fps for the master, 12–15fps for the GIF.
- **Audio:** none.
- **Cursor:** visible, but do not wiggle it.
- **Theme:** light theme for consistency with the current social preview.
- **Length:** 12–15 seconds.
- **Master file:** MP4, H.264, kept outside the repository.
- **GIF target:** under 8 MB. If it is larger, reduce the width, frame rate, or
  duration before reducing quality.

Tools:

- Windows: OBS Studio or ScreenToGif.
- macOS: Kap or QuickTime Player.
- Linux: Peek or OBS Studio.
- Conversion: `ffmpeg`.
- Optimization: `gifsicle`.

## Convert and optimize

Capture the master as `demo-master.mp4`, then create the GIF:

```bash
ffmpeg -i demo-master.mp4 \
  -vf "fps=15,scale=1200:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  -loop 0 docs/assets/demo.gif
```

If the file is still too large:

```bash
gifsicle -O3 --lossy=80 --colors 128 docs/assets/demo.gif \
  -o docs/assets/demo-optimized.gif
```

Replace `docs/assets/demo.gif` with the optimized file after checking it. Review
the optimized file at 100% and at the width it will appear in the README. Text
should remain readable.

## Screenshots

Capture at least these static images:

| File                                  | Screen                       | Use                           |
| ------------------------------------- | ---------------------------- | ----------------------------- |
| `docs/assets/screenshot-landing.png`  | Landing page hero            | README or launch post         |
| `docs/assets/screenshot-skills.png`   | Skill catalogue or matches   | README feature section        |
| `docs/assets/screenshot-exchange.png` | Exchange request with points | Launch post and release notes |
| `docs/assets/screenshot-profile.png`  | Profile with reviews         | Launch post                   |

Use PNG, 1440×900, and crop to a consistent aspect ratio if needed. Do not
upscale a smaller capture.

## Add the asset to the README

Place the GIF after the social preview banner and before the Quick start section.
Use descriptive alt text:

```markdown
![SkillEx demo: sign in, browse skills, request an exchange, and review the points breakdown](./docs/assets/demo.gif)
```

For a static screenshot:

```markdown
![SkillEx skill catalogue with seeded demo data](./docs/assets/screenshot-skills.png)
```

Keep the social preview as the repository's social image. The demo GIF is for the
README and launch posts, not the GitHub social preview.

## Review before committing

- [ ] The GIF is under 8 MB and loads quickly on a mobile connection.
- [ ] The first frame is understandable without context.
- [ ] The last frame shows a clear end state.
- [ ] No personal data, secrets, or production URLs appear in any frame.
- [ ] The alt text describes the action, not just "demo".
- [ ] The asset is committed with the README change in the same pull request.
- [ ] The README still renders correctly on a narrow screen.

## If the local stack is unavailable

Do not substitute a mockup. Either:

1. fix the local stack and capture the real app; or
2. keep the social preview banner and mark the demo asset as pending in the
   launch checklist.

A missing GIF is a smaller problem than a misleading one.

## Capture record

The first committed capture (23 November 2026) used the seeded local stack with
the demo account and no third-party integrations:

| Item        | Value                                                                                                                |
| ----------- | -------------------------------------------------------------------------------------------------------------------- |
| Frames      | 5 (landing, sign-in, matches, exchange request with the points breakdown tooltip, points wallet)                     |
| Viewport    | 1176×861 CSS pixels at 1.5 device pixel ratio; the browser window could not reach 1440×900, so nothing was upscaled  |
| Theme       | Dark, matching the social preview                                                                                    |
| GIF         | `docs/assets/demo.gif`, 1176×861 per frame, 5 frames, 385 KB, 13.6 s per loop                                        |
| Screenshots | `docs/assets/screenshot-landing.png`, `screenshot-skills.png`, `screenshot-exchange.png`, `screenshot-points.png`    |
| Skipped     | Live session room (LiveKit was not configured) and the profile page (it was not needed for the five-shot storyboard) |

The frames were captured from the running app, not composed. The Next.js
development indicator was hidden for the capture so it does not appear in the
README.
