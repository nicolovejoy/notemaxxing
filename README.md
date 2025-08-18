# Notemaxxing

A modern, collaborative note-taking application with rich text editing, folder organization, and real-time sharing.

## Features

- 📁 **Folder Organization** - Organize notebooks into color-coded folders
- 📝 **Rich Text Editor** - Full markdown support with live preview
- 👥 **Real-time Collaboration** - Share folders and notebooks with permissions
- 🔍 **Smart Search** - Search across all notes with instant results
- 🎨 **Beautiful UI** - Clean, modern interface with dark mode support
- 🔐 **Secure** - Row-level security with Supabase Auth

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:

```bash
git clone https://github.com/nicolovejoy/notemaxxing.git
cd notemaxxing
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
# Add your Supabase credentials
```

4. Run database migrations:

```bash
npx supabase db push
```

5. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Usage

### Creating Content

1. **Folders** - Click "New Folder" to organize your notebooks
2. **Notebooks** - Create notebooks within folders
3. **Notes** - Add notes to notebooks with rich text editing

### Sharing

1. Click the share icon on any folder
2. Enter email addresses to invite collaborators
3. Set permissions (read-only or read-write)
4. Recipients get an email invitation to join

### Permissions Model

- **Folder Sharing** - Share entire folders; notebooks inherit permissions
- **Owner Control** - Only owners can delete or move resources
- **Permission Levels** - Read, Write, or Admin access

## Development

### Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run type-check # Run TypeScript checks
npm run format     # Format code with Prettier
npm run lint       # Run ESLint
```

### Project Structure

```
/app          # Next.js pages and API routes
/components   # React components
/lib          # Core libraries and utilities
/supabase     # Database migrations and types
```

### Key Technologies

- **Next.js 15** - React framework with App Router
- **Supabase** - PostgreSQL database and auth
- **React Query** - Server state management
- **Zustand** - Client state for complex UIs
- **Tailwind CSS** - Utility-first styling

## API Documentation

The app uses a REST API architecture. All data operations go through API routes:

- `/api/folders` - Folder CRUD operations
- `/api/notebooks` - Notebook management
- `/api/notes` - Note operations
- `/api/shares` - Sharing and permissions
- `/api/views/*` - Aggregated data endpoints

See [PROJECT.md](./PROJECT.md) for detailed architecture documentation.

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy with `git push`

### Self-Hosting

1. Build the application:

```bash
npm run build
```

2. Start the production server:

```bash
npm start
```

## Contributing

We welcome contributions! Please see [PROJECT.md](./PROJECT.md) for development guidelines.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/nicolovejoy/notemaxxing/issues)
- **Documentation**: [PROJECT.md](./PROJECT.md) for technical details
- **Design System**: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for UI components

## Roadmap

- [ ] Mobile app (React Native)
- [ ] Offline support with sync
- [ ] AI-powered note suggestions
- [ ] Public note sharing
- [ ] Export to PDF/Markdown
- [ ] Template library

---

Built with ❤️ using Next.js and Supabase
