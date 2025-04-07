// Function to backup data to Vercel Blob with user ID
export async function backupToBlob(data: string, userId: string): Promise<{ url: string; success: boolean }> {
try {
  if (!userId) {
    console.error("No user ID provided for backup")
    return { url: "", success: false }
  }

  // Create a blob with the data
  const blob = new Blob([data], { type: "application/json" })

  // Create a file from the blob with the user ID as the filename
  const file = new File([blob], `${userId}.json`, { type: "application/json" })

  // Create form data
  const formData = new FormData()
  formData.append("file", file)
  formData.append("userId", userId)

  // Get existing file ID if available
  const existingFileId = localStorage.getItem(`backupFileId_${userId}`)
  if (existingFileId) {
    formData.append("fileId", existingFileId)
  }

  // Send the request to the user-backup endpoint
  const response = await fetch("/api/user-backup", {
    method: "POST",
    body: formData,
  })

  // Log the raw response for debugging
  console.log("Backup response status:", response.status)

  // Check if the response is OK
  if (!response.ok) {
    const errorText = await response.text()
    console.error("Backup error response:", errorText)
    throw new Error(`Backup failed with status ${response.status}`)
  }

  // Parse the response
  let result
  try {
    result = await response.json()
  } catch (e) {
    console.error("Failed to parse backup response as JSON:", e)
    throw new Error("Server returned invalid JSON response")
  }

  // Store the file ID for future updates
  if (result.fileId) {
    localStorage.setItem(`backupFileId_${userId}`, result.fileId)
  }

  return { url: result.url || "", success: true }
} catch (error) {
  console.error("Error backing up data:", error)
  return { url: "", success: false }
}
}

// Function to check if a user has a backup
export async function checkUserBackup(userId: string): Promise<{ exists: boolean; url?: string }> {
try {
  if (!userId) {
    console.error("No user ID provided for backup check")
    return { exists: false }
  }

  const response = await fetch(`/api/user-check?userId=${encodeURIComponent(userId)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
  })

  if (!response.ok) {
    return { exists: false }
  }

  const result = await response.json()
  return { exists: result.exists, url: result.url }
} catch (error) {
  console.error("Error checking user backup:", error)
  return { exists: false }
}
}

// Function to import data from Vercel Blob for a specific user
export async function importFromBlob(userId: string): Promise<{ data: string; success: boolean; lastModified?: number }> {
try {
  if (!userId) {
    console.error("No user ID provided for import")
    return { data: "", success: false }
  }

  console.log("Starting import for user:", userId)

  const response = await fetch(`/api/user-import?userId=${encodeURIComponent(userId)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
  })

  console.log("Import response status:", response.status)

  if (!response.ok) {
    let errorMessage = "Import failed"

    try {
      const errorData = await response.json()
      errorMessage = errorData.error || "Import failed"
    } catch (e) {
      errorMessage = `Import failed: ${response.statusText}`
    }

    throw new Error(errorMessage)
  }

  const result = await response.json()

  if (!result.data) {
    throw new Error("No data returned from import API")
  }

  return { 
    data: result.data, 
    success: true,
    lastModified: result.lastModified || Date.now()
  }
} catch (error) {
  console.error("Error importing data:", error)
  return { data: "", success: false }
}
}
