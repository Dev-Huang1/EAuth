import { put } from "@vercel/blob"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("Testing Vercel Blob access")

    // Create a simple test file
    const testData = JSON.stringify({ test: "data", timestamp: Date.now() })
    const testBlob = new Blob([testData], { type: "application/json" })
    const testFile = new File([testBlob], "test.json", { type: "application/json" })

    // Try to upload to Vercel Blob
    try {
      const blob = await put("test/blob-test.json", testFile, {
        access: "public",
      })

      return new Response(
        JSON.stringify({
          success: true,
          message: "Vercel Blob is working correctly",
          url: blob.url,
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
    console.error("Test route error:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Test failed",
        details: error instanceof Error ? error.stack : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
