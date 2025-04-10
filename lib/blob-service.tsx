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
export async function importFromBlob(userId: string, backupUrl?: string): Promise<{ data: string; success: boolean }> {
  try {
    if (!userId && !backupUrl) {
      console.error("No user ID or backup URL provided for import")
      return { data: "", success: false }
    }

    console.log("Starting import with:", { userId, backupUrl })

    // 如果提供了备份URL，直接从URL获取数据
    if (backupUrl) {
      try {
        console.log("Fetching backup from URL:", backupUrl)
        const fetchResponse = await fetch(`/api/fetch-backup?url=${encodeURIComponent(backupUrl)}`)
        
        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text()
          console.error("Fetch backup failed:", errorText)
          throw new Error(`Fetch backup failed: ${errorText}`)
        }
        
        const fetchResult = await fetchResponse.json()
        
        if (fetchResult.success && fetchResult.data) {
          console.log("Successfully fetched backup data, length:", fetchResult.data.length)
          return { data: fetchResult.data, success: true }
        } else {
          console.error("Fetch backup failed:", fetchResult.error)
          throw new Error(fetchResult.error || "Failed to fetch backup data")
        }
      } catch (fetchError) {
        console.error("Error fetching backup:", fetchError)
        // 如果从URL获取失败，尝试使用userId
        if (!userId) {
          return { data: "", success: false }
        }
        console.log("Falling back to userId import method")
      }
    }

    // 使用userId从API获取数据
    try {
      console.log("Importing using userId:", userId)
      const response = await fetch(`/api/direct-import?userId=${encodeURIComponent(userId)}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Import failed:", errorText)
        return { data: "", success: false }
      }

      const result = await response.json()

      if (result.success && result.data) {
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
export async function checkUserBackup(userId: string): Promise<{ exists: boolean; url?: string }> {
  try {
    if (!userId) {
      console.error("No user ID provided for check")
      return { exists: false }
    }

    console.log("Checking backup for user:", userId)

    try {
      const response = await fetch(`/api/user-check?userId=${encodeURIComponent(userId)}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Check failed:", errorText)
        return { exists: false }
      }

      const result = await response.json()
      console.log("Check result:", result)
      
      if (result.exists === true) {
        return { 
          exists: true, 
          url: result.url 
        }
      }
      
      return { exists: false }
    } catch (error) {
      console.error("Error during check:", error)
      return { exists: false }
    }
  } catch (error) {
    console.error("Check failed:", error)
    return { exists: false }
  }
}
