import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">Sign In</h1>
        <SignIn 
          signUpUrl="/sign-up"
          afterSignInUrl="/"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-none",
            }
          }}
        />
      </div>
    </div>
  )
}
