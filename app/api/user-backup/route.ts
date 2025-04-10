import { put } from "@vercel/blob"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("User backup API called")

    // Parse form data
    const formData = await request.formData()
    const file = formData.get("file") as File
    const userId = formData.get("userId") as string
    const authToken = request.headers.get("x-auth-token")

    console.log("Form data parsed:", {
      hasFile: !!file,
      fileSize: file?.size,
      hasUserId: !!userId,
      hasAuthToken: !!authToken,
    })

    // Validate required fields
    if (!file) {
      console.error("No file in request")
      return new Response(JSON.stringify({ error: "File is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!userId) {
      console.error("No userId in request")
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Simple validation - in a real app, you'd verify the token
    if (!authToken) {
      console.error("No auth token in request")
      return new Response(JSON.stringify({ error: "Authentication token is required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("Backing up for user:", userId)
    console.log("File type:", file.type, "size:", file.size)

    try {
      // Always use the same filename for a user to ensure we're updating the existing blob
      const filename = `eauth/${userId}.json`
      console.log("Using filename:", filename)

      // Use addRandomSuffix: false to ensure we replace the existing file
      console.log("Calling Vercel Blob put function")
      const blob = await put(filename, file, {
        access: "public",
        addRandomSuffix: false,
      })

      console.log("Backup successful, URL:", blob.url)

      return new Response(
        JSON.stringify({
          url: blob.url,
          success: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    } catch (blobError) {
      console.error("Blob operation error:", blobError)
      return new Response(
        JSON.stringify({
          error: `Failed to store blob: ${blobError.message}`,
          details: blobError instanceof Error ? blobError.stack : String(blobError),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  } catch (error) {
    console.error("Backup route error:", error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to backup data",
        details: error instanceof Error ? error.stack : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
