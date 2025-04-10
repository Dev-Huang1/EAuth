import { list } from "@vercel/blob"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    console.log("Check API called for user:", userId)
    console.log("Request headers:", Object.fromEntries(request.headers.entries()))

    if (!userId) {
      console.log("No userId provided")
      return new Response(JSON.stringify({ error: "User ID parameter is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("Checking backup for user:", userId)

    // 尝试列出所有带有eauth前缀的blob
    try {
      console.log("Listing blobs with prefix 'eauth/'")
      const { blobs } = await list({ prefix: "eauth/" })

      if (!blobs || blobs.length === 0) {
        console.log("No backup files found")
        return new Response(JSON.stringify({ exists: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }

      // 记录所有找到的blob以进行调试
      console.log(`Found ${blobs.length} backup files:`)
      blobs.forEach((blob, index) => {
        console.log(`Blob ${index + 1}:`, blob.pathname, blob.url)
      })

      // 找到与用户ID完全匹配的文件
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

      console.log("Found matching file:", matchingFile.pathname, "URL:", matchingFile.url)

      // 确保URL是绝对URL
      const backupUrl = matchingFile.url

      return new Response(
        JSON.stringify({
          exists: true,
          url: backupUrl,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    } catch (listError) {
      console.error("Error listing blobs:", listError)
      return new Response(
        JSON.stringify({
          error: "Failed to list backup files",
          details: listError instanceof Error ? listError.message : String(listError),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  } catch (error) {
    console.error("Check route error:", error)
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
