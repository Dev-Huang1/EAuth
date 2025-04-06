import { put } from "@vercel/blob"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const hash = formData.get("hash") as string
    const fileId = formData.get("fileId") as string | null

    if (!file || !hash) {
      return new Response(JSON.stringify({ error: "File and hash are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("Backing up with hash:", hash, "fileId:", fileId || "none")
    console.log("File type:", file.type, "size:", file.size)

    try {
      const filename = `eauth/${hash}.json`

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

        
