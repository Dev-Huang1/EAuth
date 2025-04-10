import { list } from "@vercel/blob"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    console.log("Import API called for user:", userId)
    console.log("Request headers:", Object.fromEntries(request.headers.entries()))

    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID parameter is required", success: false }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 尝试列出所有带有eauth前缀的blob
    try {
      console.log("Listing blobs with prefix 'eauth/'")
      const { blobs } = await list({ prefix: "eauth/" })

      if (!blobs || blobs.length === 0) {
        console.log("No backup files found")
        return new Response(JSON.stringify({ error: "No backup files found", success: false }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      console.log(`Found ${blobs.length} backup files`)

      // 记录所有找到的blob以进行调试
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
        return new Response(JSON.stringify({ error: "No backup found for this user", success: false }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      console.log("Found matching file:", matchingFile.pathname, matchingFile.url)

      // 获取文件内容
      try {
        console.log("Fetching file content from URL:", matchingFile.url)

        // 添加时间戳以避免缓存问题
        const fetchUrl = `${matchingFile.url}?t=${Date.now()}`
        const fileContent = await fetch(fetchUrl, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })

        console.log("File content response status:", fileContent.status)

        if (!fileContent.ok) {
          console.error("Failed to fetch file content:", fileContent.statusText)
          return new Response(JSON.stringify({ error: "Failed to retrieve backup data", success: false }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          })
        }

        const data = await fileContent.text()
        console.log("Successfully retrieved data, length:", data.length)

        // 验证数据是否为有效的JSON
        try {
          JSON.parse(data)
        } catch (jsonError) {
          console.error("Retrieved data is not valid JSON:", jsonError)
          return new Response(
            JSON.stringify({
              error: "Retrieved data is not valid JSON",
              success: false,
              dataPreview: data.substring(0, 100) + "...",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          )
        }

        return new Response(
          JSON.stringify({
            data,
            success: true,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          },
        )
      } catch (fetchError) {
        console.error("Error fetching file content:", fetchError)
        return new Response(
          JSON.stringify({
            error: "Failed to retrieve backup content",
            details: fetchError instanceof Error ? fetchError.message : String(fetchError),
            success: false,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        )
      }
    } catch (listError) {
      console.error("Error listing blobs:", listError)
      return new Response(
        JSON.stringify({
          error: "Failed to list backup files",
          details: listError instanceof Error ? listError.message : String(listError),
          success: false,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  } catch (error) {
    console.error("Import route error:", error)
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
        success: false,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
