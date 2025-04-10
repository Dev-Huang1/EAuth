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
    const { blobs } = await list({ prefix: "eauth/" })
    
    // 查找匹配的文件
    const userFile = blobs.find(blob => {
      const filename = blob.pathname.split("/").pop() || ""
      return filename === `${userId}.json`
    })

    if (!userFile) {
      return new Response(JSON.stringify({ exists: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 获取文件内容
    const fileResponse = await fetch(userFile.url)
    if (!fileResponse.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch user data" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    const data = await fileResponse.text()

    return new Response(JSON.stringify({ exists: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error fetching user data:", error)
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
      }
