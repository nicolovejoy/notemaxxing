import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { StoreProvider } from '@/lib/store'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { RealtimeStatus } from '@/components/RealtimeStatus'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: process.env.NODE_ENV === 'development' ? '[DEV] Notemaxxing' : 'Notemaxxing',
  description: "The world's best notetaking app for college students in the age of AI",
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ErrorBoundary>
          <StoreProvider>
            {children}
            <RealtimeStatus />
          </StoreProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
