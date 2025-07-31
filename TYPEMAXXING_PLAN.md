# Typemaxxing Feature - MVP Implementation Plan

## Overview

Transform user's notes into personalized typing practice by generating AI text based on selected content.

## MVP Scope

### Phase 1: Core Features (2-3 hours)

#### 1. Note Selection (Single Notebook)

- Add checkbox to each note card
- Visual feedback: highlighted border when selected
- Selected count badge: "3 notes selected"
- "Select All" / "Clear Selection" buttons
- Store selection as "Study Topic" for reuse

#### 2. Configuration Panel

- Word count selector: 50, 100, 200 words
- "Generate Practice Text" button
- Show estimated token usage/cost

#### 3. AI Text Generation

- Send full note content to Claude API
- Generate coherent practice text incorporating:
  - Key vocabulary from notes
  - Similar writing style
  - Related concepts

#### 4. Typing Test

- Display generated text
- Real-time character validation
- Highlight current word
- Show errors in red
- Calculate WPM and accuracy
- Allow backspace for corrections

#### 5. Results Screen

- Final WPM and accuracy
- Time taken
- Problem words list
- "Try Again" button (same text)
- "New Text" button (regenerate from same notes)

## Technical Implementation

### Routes

- `/typemaxxing` - Main typing practice page
- `/api/typing/generate` - Generate practice text endpoint

### State Management

```typescript
interface TypingState {
  selectedNotes: string[]
  studyTopic: StudyTopic | null
  generatedText: string
  wordCount: number
  currentPosition: number
  errors: Error[]
  startTime: number | null
  wpm: number
  accuracy: number
}
```

### Database Schema

```sql
-- Study topics (saved note selections)
CREATE TABLE study_topics (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  name TEXT,
  note_ids TEXT[],
  notebook_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Typing sessions
CREATE TABLE typing_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  study_topic_id UUID REFERENCES study_topics,
  generated_text TEXT,
  word_count INTEGER,
  duration_seconds INTEGER,
  wpm DECIMAL,
  accuracy DECIMAL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## User Flow

1. Navigate to Typemaxxing from main menu
2. Select a notebook
3. Check notes to include in practice
4. Choose word count (50/100/200)
5. Click "Generate Practice Text"
6. See preview of generated text with "Start Typing" button
7. Type the text with real-time feedback
8. View results with options to retry or generate new text

## Future Enhancements (Post-MVP)

- Multi-notebook selection
- Search/filter during note selection
- Progress tracking over time
- Difficulty settings
- Different practice modes (speed/accuracy/vocabulary)
- Gamification elements

## Implementation Steps

1. **Create Typemaxxing page** with note selection UI
2. **Add selection state** to Zustand store
3. **Build API endpoint** for text generation
4. **Implement typing test engine** with real-time validation
5. **Create results display** with retry options
6. **Add study topics** persistence

## Estimated Timeline

- Day 1: Note selection UI + state management
- Day 2: AI text generation + API endpoint
- Day 3: Typing test engine + results
- Day 4: Polish + study topics persistence

Total: ~4 days for MVP

## API Cost Estimation

### Claude 3.5 Sonnet Pricing

- **Input**: $3 per million tokens
- **Output**: $15 per million tokens

### Typical Usage Scenario

- **Average note**: ~200 words ≈ 300 tokens
- **5 notes selected**: ~1,500 tokens input
- **System prompt**: ~100 tokens
- **Generated text** (100 words): ~150 tokens output

**Per generation**: ~1,600 input tokens + 150 output tokens

### Cost Calculations

- **Per request**:
  - Input: 1,600 × $0.000003 = $0.0048
  - Output: 150 × $0.000015 = $0.00225
  - **Total: ~$0.007 per generation**

- **Heavy usage** (100 generations/day):
  - Daily: $0.70
  - Monthly: ~$21

- **Moderate usage** (20 generations/day):
  - Daily: $0.14
  - Monthly: ~$4.20

### Cost Optimization Strategies

1. Cache generated text for "retry" functionality
2. Implement daily limits per user
3. Show cost estimate before generating
4. Consider offering premium tier for heavy users
