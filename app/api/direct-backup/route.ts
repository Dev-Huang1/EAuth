import { put } from "@vercel/blob"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("Direct backup API called")

    // Parse JSON data
    const { userId, data } = await request.json()

    console.log("Request parsed:", {
      hasUserId: !!userId,
      dataLength: data?.length,
    })

    // Validate required fields
    if (!userId) {
      console.error("No userId in request")
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!data) {
      console.error("No data in request")
      return new Response(JSON.stringify({ error: "Data is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("Backing up for user:", userId)
    console.log("Data length:", data.length)

    try {
      // Create a blob with the data
      const blob = new Blob([data], { type: "application/json" })

      // Always use the same filename for a user to ensure we're updating the existing blob
      const filename = `eauth/${userId}.json`
      console.log("Using filename:", filename)

      // Use addRandomSuffix: false to ensure we replace the existing file
      console.log("Calling Vercel Blob put function")
      const blobResult = await put(filename, blob, {
        access: "public",
        addRandomSuffix: false,
      })

      console.log("Backup successful, URL:", blobResult.url)

      return new Response(
        JSON.stringify({
          url: blobResult.url,
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
    console.error("Direct backup route error:", error)
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
