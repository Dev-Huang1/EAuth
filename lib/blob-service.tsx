export async function backupToBlob(data: string, userId: string): Promise<{ url: string; success: boolean }> {
  try {
    if (!userId) {
      console.error("No user ID provided for backup")
      return { url: "", success: false }
    }

    console.log("Starting backup for user:", userId)

    const authToken = localStorage.getItem("clerk-db-jwt") || "anonymous"
    console.log("Using auth token:", authToken ? "Present (length: " + authToken.length + ")" : "Not present")

    const file = new File([data], `${userId}.json`, { type: "application/json" })

    const formData = new FormData()
    formData.append("file", file)
    formData.append("userId", userId)

    const response = await fetch("/api/user-backup", {
      method: "POST",
      headers: {
        "x-auth-token": authToken,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Backup API error response:", errorText)
      throw new Error(`Backup API failed with status ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log("Backup API response:", result.success ? "Success" : "Failed", "URL:", result.url)

    if (!result.success) {
      throw new Error(result.error || "Backup failed")
    }

    return { url: result.url, success: true }
  } catch (error) {
    console.error("Error backing up data:", error)
    return { url: "", success: false }
  }
}

export async function checkUserBackup(userId: string): Promise<boolean> {
  try {
    if (!userId) {
      console.error("No user ID provided for check")
      return false
    }

    console.log("Checking backup for user:", userId)

    const authToken = localStorage.getItem("clerk-db-jwt") || "anonymous"
    console.log("Using auth token:", authToken ? "Present (length: " + authToken.length + ")" : "Not present")

    const url = `/api/user-check?userId=${encodeURIComponent(userId)}`
    console.log("Fetching from URL:", url)

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-auth-token": authToken,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Check API error response:", errorText)
      throw new Error(`Check API failed with status ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log("Check API response:", result.exists ? "Exists" : "Does not exist")

    return result.exists === true
  } catch (error) {
    console.error("Error checking backup:", error)
    return false
  }
}
