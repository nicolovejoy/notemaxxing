# Study Features MVP

## Shared Entry Flow

- `/typemaxxing` and `/quizzing` pages
- Two modes: **Pick a notebook** (your notes as source) or **Type a topic** (AI generates content on the fly)
- All generated content is ephemeral — no persistence, no saved notebooks
- PageHeader with breadcrumbs, consistent with rest of app

## Typemaxxing

- User picks a notebook or enters a topic
- AI generates a ~100 word passage from the source material (API route exists: `/api/typing/generate`)
- Character-by-character typing, errors highlighted in real-time
- WPM + accuracy shown at end
- "Next passage" button generates another from same source
- No score persistence for MVP

## Quizzmaxxing

- User picks a notebook or enters a topic
- AI generates 5 multiple-choice questions (4 options each)
- One question at a time, pick an answer, immediate green/red feedback + brief explanation
- Score shown at end (e.g. 3/5)
- "Try again" or "New set" buttons
- No score persistence for MVP

## AI API

- New route: `/api/study/generate`
- Input: `{ mode: 'typing' | 'quiz', notes: [{title, content}], topic?: string }`
- If `topic` provided (no notebook), AI generates content from scratch on that topic
- Typing output: `{ text: string, wordCount: number }`
- Quiz output: `{ questions: [{ question, options: [4], correct_index, explanation }] }`
- Rate limit: 20 sessions/day/user (matches existing)
- Model: `claude-sonnet-4-20250514`

## Also In This Release

- Escape key navigates up breadcrumbs globally (shared `useEscapeNavigation` hook)
- Migrate quizzing/typemaxxing pages from custom headers to PageHeader

## Out of Scope (v2)

- Fill-in-the-blank questions
- Free response with AI grading
- Score persistence / history
- AI-generated notebooks (saved to Firestore)
- Spaced repetition
