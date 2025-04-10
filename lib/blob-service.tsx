// Function to backup data to Vercel Blob
export async function backupToBlob(data: string, userId: string): Promise<{ url: string; success: boolean }> {
  try {
    if (!userId) {
      console.error("No user ID provided for backup")
      return { url: "", success: false }
    }

    console.log("Starting backup for user:", userId, "Data length:", data.length)

    // Create a blob with the data
    const blob = new Blob([data], { type: "application/json" })
    console.log("Created blob:", blob.size, "bytes, type:", blob.type)

    // Create a file from the blob
    const file = new File([blob], `${userId}.json`, { type: "application/json" })
    console.log("Created file:", file.name, "size:", file.size)

    // Create form data
    const formData = new FormData()
    formData.append("file", file)
    formData.append("userId", userId)

    // Get auth token from localStorage if available
    const authToken = localStorage.getItem("clerk-db-jwt") || "anonymous"

    // Send the request to the user-backup endpoint
    console.log("Sending backup request to /api/user-backup")
    const response = await fetch("/api/user-backup", {
      method: "POST",
      body: formData,
      headers: {
        "x-auth-token": authToken,
      },
    })

    console.log("Backup response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Backup error response:", errorText)
      throw new Error(`Backup failed with status ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log("Backup successful, result:", result)
    return { url: result.url || "", success: true }
  } catch (error) {
    console.error("Error backing up data:", error)
    return { url: "", success: false }
  }
}

// Function to import data from Vercel Blob
export async function importFromBlob(userId: string): Promise<{ data: string; success: boolean }> {
  try {
    if (!userId) {
      console.error("No user ID provided for import")
      return { data: "", success: false }
    }

    console.log("Starting import for user:", userId)

    // Get auth token from localStorage if available
    const authToken = localStorage.getItem("clerk-db-jwt") || "anonymous"

    // Try API route first
    try {
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
    } catch (apiError) {
      console.error("Error with API import:", apiError)

      // Fall back to direct fetch if API fails
      const blobUrl = `https://public.blob.vercel-storage.com/eauth/${userId}.json`

      const response = await fetch(blobUrl, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      console.log("Direct blob fetch response status:", response.status)

      if (!response.ok) {
        throw new Error(`Failed to fetch blob: ${response.statusText}`)
      }

      const data = await response.text()
      return { data, success: true }
    }
  } catch (error) {
    console.error("Error importing data:", error)
    return { data: "", success: false }
  }
}

// Function to check if a user has a backup
export async function checkUserBackup(userId: string): Promise<boolean> {
  try {
    if (!userId) {
      return false
    }

    // Get auth token from localStorage if available
    const authToken = localStorage.getItem("clerk-db-jwt") || "anonymous"

    // Try API route first
    try {
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
    } catch (apiError) {
      console.error("Error with API check:", apiError)

      // Fall back to direct fetch if API fails
      const blobUrl = `https://public.blob.vercel-storage.com/eauth/${userId}.json`

      const response = await fetch(blobUrl, {
        method: "HEAD",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      return response.ok
    }
  } catch (error) {
    console.error("Error checking user backup:", error)
    return false
  }
}
