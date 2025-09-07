import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { ThemeProvider } from "@/components/theme-provider"
import { Suspense } from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Track your money and manage your finances with ease",
  keywords: ["finance", "tracker", "money", "budget", "expenses"],
  authors: [{ name: "LK Finance Tracker" }],
  creator: "LK Finance Tracker",
  publisher: "LK Finance Tracker",
  robots: "index, follow",
  openGraph: {
    title: "Finance Tracker",
    description: "Track your money and manage your finances with ease",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finance Tracker",
    description: "Track your money and manage your finances with ease",
  },
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#d97706",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Finance Tracker</title>
        <meta name="description" content="Track your money and manage your finances with ease" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#d97706" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <Suspense>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            {children}
            <Analytics />
            <SpeedInsights />
          </ThemeProvider>
        </Suspense>
      </body>
    </html>
  )
}
