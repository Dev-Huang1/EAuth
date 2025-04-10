import { list } from "@vercel/blob"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("Debug API called")
    console.log("Request headers:", Object.fromEntries(request.headers.entries()))

    // 测试Vercel Blob访问
    try {
      console.log("Testing Vercel Blob access")
      const { blobs } = await list({ prefix: "eauth/" })

      return new Response(
        JSON.stringify({
          success: true,
          message: "Debug API is working",
          blobCount: blobs.length,
          blobs: blobs.map((b) => ({
            pathname: b.pathname,
            url: b.url,
            size: b.size,
            uploadedAt: b.uploadedAt,
          })),
          env: {
            hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
            nodeEnv: process.env.NODE_ENV,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    } catch (blobError) {
      console.error("Blob test error:", blobError)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Blob test failed: ${blobError.message}`,
          details: blobError instanceof Error ? blobError.stack : String(blobError),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  } catch (error) {
    console.error("Debug route error:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Debug test failed",
        details: error instanceof Error ? error.stack : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
