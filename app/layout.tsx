import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans, Playfair_Display } from 'next/font/google'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-heading',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-script',
})

export const metadata: Metadata = {
  title: 'Ukelele de Leslie',
  description: 'Un ukelele virtual interactivo',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="es"
      className={`${cormorant.variable} ${dmSans.variable} ${playfair.variable}`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body className="min-h-screen font-body bg-black">
        {children}
      </body>
    </html>
  )
}
