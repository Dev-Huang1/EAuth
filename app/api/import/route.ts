import { list } from "@vercel/blob"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hash = searchParams.get("hash")

    if (!hash) {
      return new Response(JSON.stringify({ error: "Hash parameter is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("Import API called with hash:", hash)

    // First, try to list all blobs with the eauth prefix
    try {
      const { blobs } = await list({ prefix: "eauth/" })

      if (!blobs || blobs.length === 0) {
        console.log("No backup files found")
        return new Response(JSON.stringify({ error: "No backup files found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      console.log(`Found ${blobs.length} backup files`)

      // Find a file that contains the hash in its name
      const matchingFile = blobs.find((blob) => {
        const filename = blob.pathname.split("/").pop() || ""
        return filename.includes(hash)
      })

      if (!matchingFile) {
        console.log("No matching file found for hash:", hash)
        return new Response(JSON.stringify({ error: "No backup found for this password" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      console.log("Found matching file:", matchingFile.pathname)

      // Get the file content
      try {
        const fileContent = await fetch(matchingFile.url)

        if (!fileContent.ok) {
          console.error("Failed to fetch file content:", fileContent.statusText)
          return new Response(JSON.stringify({ error: "Failed to retrieve backup data" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          })
        }

        const data = await fileContent.text()

        return new Response(
          JSON.stringify({
            data,
            fileId: matchingFile.pathname.split("/").pop(),
            success: true,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        )
      } catch (fetchError) {
        console.error("Error fetching file content:", fetchError)
        return new Response(JSON.stringify({ error: "Failed to retrieve backup content" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }
    } catch (listError) {
      console.error("Error listing blobs:", listError)
      return new Response(JSON.stringify({ error: "Failed to list backup files" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }
  } catch (error) {
    console.error("Import route error:", error)
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

            
