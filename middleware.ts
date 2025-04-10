import { authMiddleware } from "@clerk/nextjs"

export default authMiddleware({
  // Public routes that don't require authentication
  publicRoutes: [
    "/",
    "/init",
    "/sign-in",
    "/sign-up",
    "/api/test-blob", // Make the test route public
  ],
  // Make sure API routes are properly authenticated
  apiRoutes: ["/api(.*)"],
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
