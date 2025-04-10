// Function to backup data to Vercel Blob
export async function backupToBlob(data: string, userId: string): Promise<{ url: string; success: boolean }> {
  try {
    if (!userId) {
      console.error("No user ID provided for backup")
      return { url: "", success: false }
    }

    console.log("Starting backup for user:", userId, "Data length:", data.length)

    // 尝试直接备份（JSON方法）
    try {
      console.log("Using direct backup API")
      const directResponse = await fetch("/api/direct-backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data, userId }),
      })

      if (!directResponse.ok) {
        const errorText = await directResponse.text()
        console.error("Direct backup failed:", errorText)
        return { url: "", success: false }
      }

      const directResult = await directResponse.json()
      if (directResult.success) {
        console.log("Direct backup successful, URL:", directResult.url)
        return { url: directResult.url, success: true }
      } else {
        console.error("Direct backup failed:", directResult.error)
        return { url: "", success: false }
      }
    } catch (directError) {
      console.error("Error during direct backup:", directError)
      return { url: "", success: false }
    }
  } catch (error) {
    console.error("Backup failed:", error)
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

    try {
      const response = await fetch(`/api/direct-import?userId=${userId}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Import failed:", errorText)
        return { data: "", success: false }
      }

      const result = await response.json()

      if (result.success) {
        console.log("Import successful, data length:", result.data.length)
        return { data: result.data, success: true }
      } else {
        console.error("Import failed:", result.error)
        return { data: "", success: false }
      }
    } catch (error) {
      console.error("Error during import:", error)
      return { data: "", success: false }
    }
  } catch (error) {
    console.error("Import failed:", error)
    return { data: "", success: false }
  }
}

// Function to check if a user has a backup
export async function checkUserBackup(userId: string): Promise<boolean> {
  try {
    if (!userId) {
      console.error("No user ID provided for check")
      return false
    }

    console.log("Checking backup for user:", userId)

    try {
      const response = await fetch(`/api/user-check?userId=${userId}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Check failed:", errorText)
        return false
      }

      const result = await response.json()
      return result.exists === true
    } catch (error) {
      console.error("Error during check:", error)
      return false
    }
  } catch (error) {
    console.error("Check failed:", error)
    return false
  }
}
