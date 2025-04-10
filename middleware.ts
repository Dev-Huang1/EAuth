import { authMiddleware } from "@clerk/nextjs/server"

export default authMiddleware({
  // Public routes that don't require authentication
  publicRoutes: ["/", "/init", "/sign-in", "/sign-up", "/api/user-data", "/api/user-backup"],
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
