import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">Sign In</h1>
        <SignIn
          signUpUrl="/sign-up"
          afterSignInUrl="/"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-sm border border-gray-200 dark:border-gray-800 rounded-lg",
            },
          }}
        />
      </div>
    </div>
  )
}

