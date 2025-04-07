import { put } from "@vercel/blob"
import type { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"

export async function POST(request: NextRequest) {
  try {
    const { userId: authUserId } = auth()

    if (!authUserId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const userId = formData.get("userId") as string
    const fileId = formData.get("fileId") as string | null

    if (!file || !userId) {
      return new Response(JSON.stringify({ error: "File and userId are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Verify the requested userId matches the authenticated userId
    if (userId !== authUserId) {
      return new Response(JSON.stringify({ error: "Unauthorized access to another user's data" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("Backing up for user:", userId, "fileId:", fileId || "none")
    console.log("File type:", file.type, "size:", file.size)

    try {
      const filename = `eauth/${userId}.json`

      // If we have a fileId, we're updating an existing file
      const options = fileId
        ? { access: "public", addRandomSuffix: false, replaceFileId: fileId }
        : { access: "public", addRandomSuffix: false }

      const blob = await put(filename, file, options)

      console.log("Backup successful, URL:", blob.url)

      return new Response(
        JSON.stringify({
          url: blob.url,
          fileId: blob.url.split("/").pop(),
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
          details: blobError.stack,
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
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

