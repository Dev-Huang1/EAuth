import { put } from "@vercel/blob"
import type { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
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

      // Use addRandomSuffix: false to ensure we replace the existing file
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
    } catch (blobError: any) {
      console.error("Blob operation error:", blobError)
      return new Response(
        JSON.stringify({
          error: `Failed to store blob: ${blobError.message}`,
          details: blobError.stack,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  } catch (error: any) {
    console.error("Backup route error:", error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to backup data",
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
