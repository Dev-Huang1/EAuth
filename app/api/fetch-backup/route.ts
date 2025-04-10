import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")

    if (!url) {
      return new Response(JSON.stringify({ error: "URL parameter is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("Fetching backup from URL:", url)

    try {
      // 添加时间戳以避免缓存问题
      const fetchUrl = `${url}?t=${Date.now()}`
      const response = await fetch(fetchUrl, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      console.log("Fetch response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Fetch error response:", errorText)
        return new Response(JSON.stringify({ error: `Failed to fetch data: ${errorText}` }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }

      const data = await response.text()
      console.log("Successfully fetched data, length:", data.length)

      // 验证数据是否为有效的JSON
      try {
        JSON.parse(data)
      } catch (jsonError) {
        console.error("Retrieved data is not valid JSON:", jsonError)
        return new Response(JSON.stringify({ error: "Retrieved data is not valid JSON" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }

      return new Response(
        JSON.stringify({
          data,
          success: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    } catch (fetchError) {
      console.error("Error fetching data:", fetchError)
      return new Response(
        JSON.stringify({
          error: "Failed to fetch backup data",
          details: fetchError instanceof Error ? fetchError.message : String(fetchError),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  } catch (error) {
    console.error("Fetch backup route error:", error)
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
