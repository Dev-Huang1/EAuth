import { put } from "@vercel/blob"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, data } = body

    if (!userId || !data) {
      return new Response(JSON.stringify({ error: "User ID and data are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("Backing up data for user:", userId, "Data length:", data.length)

    // 创建一个blob
    const blob = new Blob([data], { type: "application/json" })

    // 保存到Vercel Blob
    const result = await put(`eauth/${userId}.json`, blob, {
      access: "public",
      addRandomSuffix: false,
    })

    console.log("Backup successful, URL:", result.url)

    return new Response(JSON.stringify({ success: true, url: result.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error backing up user data:", error)
    return new Response(JSON.stringify({ error: "Server error", details: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
