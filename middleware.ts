import { authMiddleware } from "@clerk/nextjs"

export default authMiddleware({
  // Public routes that don't require authentication
  publicRoutes: [
    "/",
    "/init",
    "/sign-in",
    "/sign-up",
    "/api/test-blob",
    "/api/user-backup",
    "/api/user-import",
    "/api/user-check",
    "/api/direct-backup", // Add the new direct backup route
    "/api/auth-test",
  ],
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)((.*)"],
}
