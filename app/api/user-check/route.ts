import { list } from "@vercel/blob"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const authToken = request.headers.get("x-auth-token")

    console.log("Check API called for user:", userId)
    console.log("Has auth token:", !!authToken)

    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID parameter is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!authToken) {
      return new Response(JSON.stringify({ error: "Authentication token is required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("Checking backup for user:", userId)

    // List all blobs with the eauth prefix
    try {
      const { blobs } = await list({ prefix: "eauth/" })

      if (!blobs || blobs.length === 0) {
        console.log("No backup files found")
        return new Response(JSON.stringify({ exists: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }

      // Find a file that exactly matches the user ID
      const matchingFile = blobs.find((blob) => {
        const filename = blob.pathname.split("/").pop() || ""
        return filename === `${userId}.json`
      })

      if (!matchingFile) {
        console.log("No matching file found for user:", userId)
        return new Response(JSON.stringify({ exists: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }

      console.log("Found matching file:", matchingFile.pathname)

      return new Response(
        JSON.stringify({
          exists: true,
          url: matchingFile.url,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    } catch (listError) {
      console.error("Error listing blobs:", listError)
      return new Response(JSON.stringify({ error: "Failed to list backup files" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }
  } catch (error) {
    console.error("Check route error:", error)
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
