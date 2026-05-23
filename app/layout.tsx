import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AMPLYFY Hub — Business Management',
  description: 'Secure business management hub for Amplyfy Consulting. Track revenue, manage pipeline, leads, and marketing campaigns.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
