# Notemaxxing

A modern note-taking application built with Next.js, TypeScript, and Tailwind CSS. Organize your thoughts with folders, notebooks, and notes while improving your typing skills.

🌐 **Live at**: [notemaxxing.net](https://notemaxxing.net)

## Features

### 📁 Dynamic Folders
- Create custom folders with names and colors
- Rename folders inline
- Delete folders with cascade deletion
- Visual organization with color coding

### 📓 Smart Notebooks
- Create notebooks within folders
- Rename notebooks anytime
- Archive notebooks instead of deleting
- Restore archived notebooks
- Permanent delete option for archived items

### 📝 Note Taking
- Create and edit notes within notebooks
- Auto-save functionality
- Clean, distraction-free editor
- Organized note management

### ⌨️ Typemaxxing
- Practice typing with real-time feedback
- Track WPM (Words Per Minute)
- Monitor accuracy percentage
- Visual keyboard display

### 🎯 Quizzing
- Create custom quizzes by subject
- Add questions and answers
- Practice mode with self-grading
- Track your progress

## Tech Stack

- **Framework**: Next.js 15.4
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Storage**: localStorage (client-side)
- **Deployment**: Vercel
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

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

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

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
│   └── storage.ts         # Data persistence layer
├── public/                # Static assets
└── components/            # React components
```

## Data Storage

All data is stored locally in the browser using localStorage:
- `notemaxxing-folders`: User-created folders
- `notemaxxing-notebooks`: Notebooks with archive support
- `notemaxxing-notes`: Individual notes
- `notemaxxing-quizzes`: Quiz questions and answers

See [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) for detailed information.

## Development

### Key Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript compiler

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

See [TODO.md](./TODO.md) for planned features and improvements.

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Deployed on [Vercel](https://vercel.com)
- Icons by [Lucide](https://lucide.dev/)