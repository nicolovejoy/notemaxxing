# Notemaxxing

A modern note-taking application built with Next.js, TypeScript, and Tailwind CSS. Organize your thoughts with folders, notebooks, and notes while improving your typing skills.

🌐 **Live at**: [notemaxxing.net](https://notemaxxing.net) ✅

## Features

### 📁 Dynamic Folders

- Create custom folders with names and colors
- Rename folders inline
- Delete folders with cascade deletion
- Share folders with other users via email invitations

### 📓 Smart Notebooks

- Create notebooks within folders
- Rename notebooks anytime
- Archive notebooks instead of deleting
- Restore archived notebooks
- Permanent delete option for archived items

### 📝 Note Taking

- Create and edit notes within notebooks
- **Rich Text Editor**: Bold, italic, lists, headings with TipTap
- **AI Enhancement**: Improve grammar and clarity with Claude AI
- **Text Selection Enhancement**: Enhance specific portions of text
- **Preview Before Apply**: See AI changes side-by-side before accepting
- **Undo Support**: Revert AI enhancements with dedicated undo
- Auto-save functionality with smart title generation
- Card-based grid view with sorting options
- Contextual navigation between notebooks

### ⌨️ Typemaxxing

- **AI-Powered Practice**: Generate typing tests from your own notes
- **Note Selection**: Choose specific notes to practice with
- **Customizable Length**: 50, 100, or 200 word practice sessions
- **Real-time Feedback**: Character-by-character validation
- **Performance Metrics**: Track WPM and accuracy
- **Cost Transparency**: See estimated API usage before generating

### 🎯 Quizzing

- Create custom quizzes by subject
- Add questions and answers
- Practice mode with self-grading
- Track your progress

### 🔄 Real-Time Sync (Beta)

- WebSocket-based real-time synchronization
- Connection status indicator
- Automatic reconnection with exponential backoff
- Shared resource access via Supabase Edge Functions

## Tech Stack

- **Framework**: Next.js 15.4.4 with App Router
- **Language**: TypeScript 5.7.3
- **UI**: React 19.1.0 + Tailwind CSS 4
- **Rich Text**: TipTap 3.0 Editor
- **AI Integration**: Anthropic Claude 3.5 Sonnet
- **State Management**: Zustand 5.0.6 with Immer middleware
- **Auth & Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React
- **Code Quality**: ESLint, Prettier, Husky pre-commit hooks
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account (for cloud features)

### Setup

1. Clone and install:

```bash
git clone https://github.com/nicolovejoy/notemaxxing.git
cd notemaxxing
npm install
```

2. Set up Supabase:

- Create project at [supabase.com](https://supabase.com)
- Run schema from `/scripts/complete-database-setup.sql`
- Copy `.env.local.example` to `.env.local` and add your keys

3. Run:

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
notemaxxing/
├── app/                    # Next.js app directory
│   ├── folders/           # Folder management page
│   ├── notebooks/[id]/    # Individual notebook pages
│   ├── typemaxxing/       # Typing practice
│   ├── quizzing/          # Quiz feature
│   └── page.tsx           # Homepage
├── lib/                   # Utilities
│   ├── store/            # Zustand store with hooks
│   │   └── realtime-manager.ts  # WebSocket sync manager
│   ├── supabase/         # Database client & schema
│   └── storage.ts        # Legacy localStorage (being phased out)
├── supabase/              # Supabase configuration
│   └── functions/        # Edge Functions for shared resources
├── scripts/               # Deployment and database scripts
├── public/                # Static assets
└── components/            # React components
```

## Data Storage

Data is stored in Supabase PostgreSQL with:

- User authentication
- Real-time sync
- Row-level security
- Offline support (coming soon)

## Development

### Design System

We have a comprehensive design system with reusable components. **Always use these components instead of creating new ones.**

See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for:

- Complete component documentation
- Usage examples
- Design tokens (colors, spacing, typography)
- Best practices

### Key Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Testing in Production (Vercel)

To test changes in production without committing to main:

```bash
# Create a preview branch and deploy
git checkout -b preview/your-feature
git add -A
git commit -m "Test: your feature"
git push origin preview/your-feature
```

Vercel automatically creates a preview URL for every branch. Check your Vercel dashboard or the GitHub PR for the preview link.

After testing, clean up:

```bash
git checkout main
git branch -D preview/your-feature
git push origin --delete preview/your-feature
```

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT License.
