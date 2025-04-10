// Function to backup data to Vercel Blob
export async function backupToBlob(data: string, userId: string): Promise<{ url: string; success: boolean }> {
  try {
    if (!userId) {
      console.error("No user ID provided for backup")
      return { url: "", success: false }
    }

    console.log("Starting backup for user:", userId, "Data length:", data.length)

    // Try direct backup (JSON approach)
    try {
      console.log("Using direct backup API")
      const directResponse = await fetch("/api/direct-backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          data,
        }),
      })

      console.log("Direct backup response status:", directResponse.status)

      if (directResponse.ok) {
        const result = await directResponse.json()
        console.log("Direct backup successful, result:", result)
        return { url: result.url || "", success: true }
      } else {
        const errorText = await directResponse.text()
        console.error("Direct backup error response:", errorText)
        throw new Error(`Direct backup failed with status ${directResponse.status}: ${errorText}`)
      }
    } catch (directError) {
      console.error("Error with direct backup:", directError)
      return { url: "", success: false }
    }
  } catch (error) {
    console.error("Error backing up data:", error)
    return { url: "", success: false }
  }
}

// Function to import data from Vercel Blob - only use API routes, no direct blob access
export async function importFromBlob(userId: string): Promise<{ data: string; success: boolean }> {
  try {
    if (!userId) {
      console.error("No user ID provided for import")
      return { data: "", success: false }
    }

    console.log("Starting import for user:", userId)

    // Get auth token from localStorage if available
    const authToken = localStorage.getItem("clerk-db-jwt") || "anonymous"

    // Only use API route, don't try direct blob access
    const apiResponse = await fetch(`/api/user-import?userId=${encodeURIComponent(userId)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
        "x-auth-token": authToken,
      },
    })

    console.log("API import response status:", apiResponse.status)

    if (!apiResponse.ok) {
      throw new Error(`API import failed: ${apiResponse.statusText}`)
    }

    const result = await apiResponse.json()

    if (!result.data) {
      throw new Error("No data returned from import API")
    }

    return { data: result.data, success: true }
  } catch (error) {
    console.error("Error importing data:", error)
    return { data: "", success: false }
  }
}

// Function to check if a user has a backup - only use API routes, no direct blob access
export async function checkUserBackup(userId: string): Promise<boolean> {
  try {
    if (!userId) {
      return false
    }

    // Get auth token from localStorage if available
    const authToken = localStorage.getItem("clerk-db-jwt") || "anonymous"

    // Only use API route, don't try direct blob access
    const apiResponse = await fetch(`/api/user-check?userId=${encodeURIComponent(userId)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
        "x-auth-token": authToken,
      },
    })

    console.log("API check response status:", apiResponse.status)

    if (!apiResponse.ok) {
      throw new Error(`API check failed: ${apiResponse.statusText}`)
    }

    const result = await apiResponse.json()
    return result.exists === true
  } catch (error) {
    console.error("Error checking user backup:", error)
    return false
  }
}
