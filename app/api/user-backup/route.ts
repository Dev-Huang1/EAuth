import { put } from "@vercel/blob"
import type { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"

export async function POST(request: NextRequest) {
  try {
    console.log("User backup API called")

    // Get authentication info
    const authInfo = auth()
    console.log("Auth info:", JSON.stringify(authInfo, null, 2))

    // Check if user is authenticated
    if (!authInfo.userId) {
      console.error("No userId from auth")
      return new Response(JSON.stringify({ error: "Unauthorized - No user ID" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const userId = authInfo.userId
    console.log("Authenticated userId:", userId)

    console.log("Parsing form data")
    const formData = await request.formData()
    const file = formData.get("file") as File

    console.log("Form data parsed:", {
      hasFile: !!file,
      fileType: file?.type,
      fileSize: file?.size,
    })

    if (!file) {
      console.error("No file in request")
      return new Response(JSON.stringify({ error: "File is required" }), {
        status: 400,
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
