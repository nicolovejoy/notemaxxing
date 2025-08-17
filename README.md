# Notemaxxing

A modern note-taking application built with Next.js, TypeScript, and Tailwind CSS. Organize your thoughts with folders, notebooks, and notes while improving your typing skills.

🌐 **Live at**: [notemaxxing.net](https://notemaxxing.net) ✅

## Features

### 📁 Folders

- Create folders (in your backpack) with names and colors
- Rename folders
- Delete folders (need to test if this works)
- Share folders with other users via email invitations (working as of 8/16)

### 📓 Notebooks

- Create notebooks within folders
- Archive notebooks (need to review if this exists and works at some point)
- Permanent delete option for archived items (need to review if this exists and works at some point)

### 📝 Note Taking

- Create and edit notes within notebooks
- **Rich Text Editor**: Bold, italic, lists, headings with TipTap
- **AI Enhancement**: Improve grammar and clarity with Claude AI, for all or part of a Note
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

- unclear what's here. need to revisit

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
