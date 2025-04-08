// Function to backup data to Vercel Blob
export async function backupToBlob(data: string, userId: string): Promise<{ url: string; success: boolean }> {
  try {
    if (!userId) {
      console.error("No user ID provided for backup")
      return { url: "", success: false }
    }

    // Create a blob with the data
    const blob = new Blob([data], { type: "application/json" })

    // Create a file from the blob
    const file = new File([blob], `${userId}.json`, { type: "application/json" })

    // Create form data
    const formData = new FormData()
    formData.append("file", file)

    // Send the request to the user-backup endpoint
    const response = await fetch("/api/user-backup", {
      method: "POST",
      body: formData,
    })

    console.log("Backup response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Backup error response:", errorText)
      throw new Error(`Backup failed with status ${response.status}`)
    }

    const result = await response.json()
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

    // Direct fetch from the expected blob URL
    const blobUrl = `https://public.blob.vercel-storage.com/eauth/${userId}.json`

    try {
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
    } catch (fetchError) {
      console.error("Error fetching blob directly:", fetchError)

      // Fall back to API route if direct fetch fails
      const apiResponse = await fetch(`/api/user-import?userId=${encodeURIComponent(userId)}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      })

      if (!apiResponse.ok) {
        throw new Error(`API import failed: ${apiResponse.statusText}`)
      }

      const result = await apiResponse.json()

      if (!result.data) {
        throw new Error("No data returned from import API")
      }

      return { data: result.data, success: true }
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

    // Try direct fetch first
    const blobUrl = `https://public.blob.vercel-storage.com/eauth/${userId}.json`

    try {
      const response = await fetch(blobUrl, {
        method: "HEAD",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      return response.ok
    } catch (fetchError) {
      console.error("Error checking blob directly:", fetchError)

      // Fall back to API route
      const apiResponse = await fetch(`/api/user-check?userId=${encodeURIComponent(userId)}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      })

      if (!apiResponse.ok) {
        return false
      }

      const result = await apiResponse.json()
      return result.exists === true
    }
  } catch (error) {
    console.error("Error checking user backup:", error)
    return false
  }
}
