// Function to backup data to Vercel Blob
export async function backupToBlob(data: string, userId?: string): Promise<{ url: string; success: boolean }> {
  try {
    // Create a blob with the data
    const blob = new Blob([data], { type: "application/json" })

    // Create a file from the blob
    const file = new File([blob], `backup.json`, { type: "application/json" })

    // Create form data
    const formData = new FormData()
    formData.append("file", file)

    // Get existing file ID if available
    const existingFileId = localStorage.getItem("backupFileId")
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
      localStorage.setItem("backupFileId", result.fileId)
    }

    return { url: result.url || "", success: true }
  } catch (error) {
    console.error("Error backing up data:", error)
    return { url: "", success: false }
  }
}

// Function to import data from Vercel Blob
export async function importFromBlob(): Promise<{ data: string; success: boolean }> {
  try {
    console.log("Starting import for authenticated user")

    const response = await fetch(`/api/user-import`, {
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

    return { data: result.data, success: true }
  } catch (error) {
    console.error("Error importing data:", error)
    return { data: "", success: false }
  }
}

