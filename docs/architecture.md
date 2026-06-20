# DUALFORGE Architecture

DUALFORGE is a private-first PWA for discipline duels. The MVP focuses on two users, while the data model supports multiple duel memberships and future parallel seasons.

## Folder Architecture

```text
dualforge/
  docs/
    architecture.md
  supabase/
    migrations/
      001_initial_schema.sql
  public/
    manifest.webmanifest
  src/
    components/
      Arena.tsx
      AuthScreen.tsx
      ChallengeCenter.tsx
      Dashboard.tsx
      EvidenceCenter.tsx
      HabitBoard.tsx
      Layout.tsx
      NeonCard.tsx
      ProfileSetup.tsx
    lib/
      metrics.ts
      storage.ts
      supabase.ts
    styles/
      index.css
    types.ts
    App.tsx
    main.tsx
```

## Database Schema

Core tables:

- `profiles`: user identity, avatar, motto, level and privacy settings.
- `duels`: duel metadata, invitation code, duration, rules and rescue cooldown.
- `duel_members`: users attached to a duel.
- `seasons`: dated competitive periods inside a duel.
- `habits`: user-created discipline habits.
- `habit_checkins`: daily completion evidence for habits.
- `goals`, `goal_milestones`: personal goals and measurable milestones.
- `recovery_challenges`: rival-created rescue challenges.
- `challenge_evidence`: submissions for recovery challenges.
- `challenge_reviews`: approvals, rejections and revision requests.
- `posts`: learning feed entries.
- `library_folders`, `notes`, `flashcard_decks`, `flashcards`, `flashcard_reviews`: personal library and spaced review foundation.
- `notifications`: future in-app and push notification queue.
- `activity_logs`: immutable audit trail for important actions.
- `score_events`: Disciplina XP event ledger.

Storage buckets:

- `avatars`: public profile avatars.
- `evidence`: private challenge and habit evidence files.
- `library`: private documents for notes and learning resources.

## RLS Model

- Users can read and edit their own private content.
- Duel members can read shared duel data and shared profile/progress fields.
- Rival-visible content is filtered by visibility fields: `private`, `shared_progress`, `shared_full`, `duel`, `public`.
- Only a recovery challenge creator can approve, reject or request new evidence.
- Evidence rows are soft-deleted with `deleted_at`; deletion must be logged in `activity_logs`.
- Inserts and updates use `auth.uid()` and membership helper functions to avoid trusting client input.

## Main Routes

The MVP is implemented as a PWA-style single-page app with route-like tabs:

- `/auth`: sign in and sign up with Supabase Auth.
- `/profile`: first-run profile setup.
- `/dashboard`: daily command center.
- `/arena`: direct duel comparison.
- `/habits`: habit creation and daily check-ins.
- `/challenges`: recovery challenges and review workflow.
- `/evidence`: evidence center and activity history.

Future routes:

- `/goals`
- `/feed`
- `/library`
- `/settings/privacy`
- `/admin/safety-rules`

## Main Components

- `AuthScreen`: Supabase email/password sign in and sign up.
- `ProfileSetup`: creates or updates the authenticated profile.
- `Layout`: responsive shell, navigation, rival/duel context.
- `Dashboard`: streak, pending habits, XP, weekly completion, goals snapshot and heatmap.
- `Arena`: side-by-side competitive metrics.
- `HabitBoard`: CRUD-lite habit creation, daily checklist and local streak status.
- `ChallengeCenter`: create rescue challenges, submit evidence and approve/reject submissions.
- `EvidenceCenter`: evidence list with review state and audit timeline.
- `NeonCard`: shared dark/neon panel primitive.

## Disciplina XP

XP is event-ledger based, not just habit-count based:

- Habit completion: base points multiplied by difficulty.
- Essential consistency: streak and weekly completion modifiers.
- Evidence submission: small bonus only when required and submitted.
- Recovery challenge approved: rescue points without increasing streak.
- Recovery challenge rejected or expired: configurable penalty.
- Goal milestones: milestone reward based on difficulty and progress.
- Weekly missions: planned extension through `score_events`.

## Streak Rules

Daily status is derived from essential habits and approved rescue challenges:

- `completed`: all essential habits due that day are completed; streak increases by 1.
- `rescued`: essential habit failure was recovered through an approved challenge; streak stays at the previous value.
- `failed`: essential habit failure without approved rescue; streak resets to 0.

A rescued day must not increase the streak.

## Challenge Safety Rules

Recovery challenges must be moderated by product rules and UI copy. The MVP blocks dangerous prompt keywords and recommends safe challenge categories:

- study
- exercise
- order
- reading
- projects
- reflection
- productivity

Forbidden challenge categories include dangerous, illegal, humiliating, self-harm, alcohol, drugs and money-related tasks.

## Implementation Phases

1. MVP private duel:
   - Supabase auth and profiles.
   - Duel creation with invitation code.
   - Habit creation and daily check-ins.
   - Streak calculation.
   - Arena comparison.
   - Recovery challenges.
   - Evidence upload and review.
   - Dark neon dashboard.
2. Progress and learning:
   - Goals, milestones and feed.
   - Reactions, comments and richer privacy controls.
3. Library:
   - Folders, notes, links, documents and flashcards.
   - Review sessions and spaced repetition analytics.
4. Notifications and automations:
   - In-app notifications.
   - Push notifications.
   - Scheduled reminders and weekly mission generation.
5. Intelligence layer:
   - AI coaching, summaries and challenge suggestions after safety and audit foundations are stable.

