import { auth } from "@clerk/nextjs/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Get authentication info
    const authInfo = auth()

    // Return authentication status
    return new Response(
      JSON.stringify({
        isAuthenticated: !!authInfo.userId,
        userId: authInfo.userId || null,
        sessionId: authInfo.sessionId || null,
        orgId: authInfo.orgId || null,
        authInfo: authInfo,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Auth test error:", error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Authentication test failed",
        details: error instanceof Error ? error.stack : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
