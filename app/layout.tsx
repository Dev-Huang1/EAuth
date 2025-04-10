import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { ClerkProvider } from "@clerk/nextjs"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "2FA Auth Code App",
  description: "Secure 2FA code management application",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <ClerkProvider
        publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
        signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}
        signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL}
        afterSignInUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL}
        afterSignUpUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL}
      >
        <body className={inter.className}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
            <Toaster />
          </ThemeProvider>
        </body>
      </ClerkProvider>
    </html>
  )
}

