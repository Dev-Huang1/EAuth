import { list } from "@vercel/blob"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("Fetching data for user:", userId)

    // 列出所有blob
    try {
      const { blobs } = await list({ prefix: "eauth/" })
      console.log(`Found ${blobs.length} blobs with prefix 'eauth/'`)

      // 查找匹配的文件
      const userFile = blobs.find((blob) => {
        const filename = blob.pathname.split("/").pop() || ""
        return filename === `${userId}.json`
      })

      if (!userFile) {
        console.log(`No file found for user ${userId}`)
        return new Response(JSON.stringify({ exists: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }

      console.log(`Found file for user ${userId}: ${userFile.url}`)

      // 获取文件内容
      try {
        const fileResponse = await fetch(userFile.url, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })

        if (!fileResponse.ok) {
          console.error(`Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`)
          return new Response(JSON.stringify({ error: "Failed to fetch user data" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          })
        }

        const data = await fileResponse.text()
        console.log(`Successfully fetched data, length: ${data.length}`)

        return new Response(JSON.stringify({ exists: true, data }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      } catch (fetchError) {
        console.error("Error fetching file:", fetchError)
        return new Response(JSON.stringify({ error: "Failed to fetch file content", details: String(fetchError) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }
    } catch (listError) {
      console.error("Error listing blobs:", listError)
      return new Response(JSON.stringify({ error: "Failed to list blobs", details: String(listError) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }
  } catch (error) {
    console.error("Error in user-data API:", error)
    return new Response(JSON.stringify({ error: "Server error", details: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
