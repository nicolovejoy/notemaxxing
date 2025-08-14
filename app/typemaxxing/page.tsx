'use client'

// This page needs to be updated to use the new ViewStore pattern
// Temporarily disabled to fix build errors

export default function TypingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Typing Practice</h1>
        <p className="text-gray-600">
          This feature is temporarily unavailable while we update the app.
        </p>
        <a href="/folders" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          Return to Folders
        </a>
      </div>
    </div>
  )
}
