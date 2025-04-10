import { list } from "@vercel/blob"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    console.log("Debug Check API called for user:", userId)

    // 返回环境信息
    const envInfo = {
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      nodeEnv: process.env.NODE_ENV,
    }

    // 尝试列出所有带有eauth前缀的blob
    try {
      console.log("Listing blobs with prefix 'eauth/'")
      const { blobs } = await list({ prefix: "eauth/" })

      return new Response(
        JSON.stringify({
          success: true,
          userId,
          blobCount: blobs.length,
          blobs: blobs.map((b) => ({
            pathname: b.pathname,
            url: b.url,
            size: b.size,
            uploadedAt: b.uploadedAt,
          })),
          env: envInfo,
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
          success: false,
          error: `Blob listing failed: ${listError.message}`,
          details: listError instanceof Error ? listError.stack : String(listError),
          env: envInfo,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  } catch (error) {
    console.error("Debug check route error:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Debug check failed",
        details: error instanceof Error ? error.stack : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
        }
