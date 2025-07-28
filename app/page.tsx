import Link from "next/link";
import { Menu, Search, Grid3X3, User } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button className="p-2 rounded-md hover:bg-gray-100">
                <Menu className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="ml-4 text-xl font-semibold italic">Notemaxxing</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-md hover:bg-gray-100">
                <Search className="h-5 w-5 text-gray-600" />
              </button>
              <button className="p-2 rounded-md hover:bg-gray-100">
                <Grid3X3 className="h-5 w-5 text-gray-600" />
              </button>
              <button className="p-2 rounded-md hover:bg-gray-100">
                <User className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center px-4 py-16">
        <h1 className="text-4xl font-light italic mb-4">Notemaxxing</h1>
        <div className="w-24 h-0.5 bg-gray-300 mb-8"></div>
        <p className="text-xl text-gray-700 mb-16 italic">Enhance your note-taking skills</p>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          {/* Folders Card */}
          <Link href="/folders" className="block">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 h-64 hover:shadow-lg transition-shadow">
              <h2 className="text-lg font-medium mb-4 italic">Folders</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-200 rounded-lg p-4 flex items-center justify-center">
                  <span className="text-sm font-medium italic">Q1</span>
                </div>
                <div className="bg-gray-200 rounded-lg p-4 flex items-center justify-center">
                  <span className="text-sm font-medium italic">Q2</span>
                </div>
                <div className="bg-gray-200 rounded-lg p-4"></div>
                <div className="bg-gray-200 rounded-lg p-4"></div>
                <div className="bg-gray-200 rounded-lg p-4"></div>
                <div className="bg-gray-200 rounded-lg p-4"></div>
              </div>
            </div>
          </Link>

          {/* Typemaxxing Card */}
          <Link href="/typemaxxing" className="block">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 h-64 hover:shadow-lg transition-shadow flex flex-col">
              <h2 className="text-lg font-medium mb-4 italic">Typemaxxing</h2>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-xs">
                  <div className="border-2 border-gray-300 rounded-lg p-2">
                    <div className="grid grid-cols-12 gap-1">
                      {Array.from({ length: 48 }).map((_, i) => (
                        <div key={i} className="aspect-square border border-gray-200 rounded-sm"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Quizzing Card */}
          <Link href="/quizzing" className="block md:col-span-2 md:max-w-md">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 h-64 hover:shadow-lg transition-shadow">
              <h2 className="text-lg font-medium mb-4 italic">Quizzing</h2>
              <div className="flex items-center justify-center h-32 relative">
                <div className="bg-gray-100 rounded-lg p-4 w-48 h-24 flex items-center justify-center">
                  <div className="bg-gray-200 w-full h-full rounded"></div>
                </div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                  <span className="text-sm italic">Test Prepara...</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="bg-gray-50 rounded-lg px-3 py-2 inline-flex items-center">
                  <span className="text-sm italic">Neuroscience...</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}