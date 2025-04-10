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

      // 尝试使用FormData方法作为备份
      try {
        console.log("Falling back to FormData approach")

        // 创建一个包含数据的blob
        const blob = new Blob([data], { type: "application/json" })
        console.log("Created blob:", blob.size, "bytes, type:", blob.type)

        // 从blob创建一个文件
        const file = new File([blob], `${userId}.json`, { type: "application/json" })
        console.log("Created file:", file.name, "size:", file.size)

        // 创建表单数据
        const formData = new FormData()
        formData.append("file", file)
        formData.append("userId", userId)

        // 从localStorage获取auth token（如果可用）
        const authToken = localStorage.getItem("clerk-db-jwt") || "anonymous"

        // 发送请求到user-backup端点
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
      } catch (formDataError) {
        console.error("FormData backup also failed:", formDataError)
        return { url: "", success: false }
      }
    }
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

    // 尝试使用直接导入API
    try {
      console.log("Trying direct import API")
      const timestamp = Date.now()
      const directResponse = await fetch(`/api/debug?userId=${encodeURIComponent(userId)}&t=${timestamp}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      console.log("Debug API response status:", directResponse.status)

      if (!directResponse.ok) {
        const errorText = await directResponse.text()
        console.error("Debug API error response:", errorText)
        throw new Error(`Debug API failed with status ${directResponse.status}: ${errorText}`)
      }

      const debugResult = await directResponse.json()
      console.log("Debug API result:", debugResult)

      // 现在尝试实际导入
      const timestamp2 = Date.now()
      const directImportResponse = await fetch(
        `/api/direct-import?userId=${encodeURIComponent(userId)}&t=${timestamp2}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      )

      console.log("Direct import API response status:", directImportResponse.status)

      if (!directImportResponse.ok) {
        const errorText = await directImportResponse.text()
        console.error("Direct import API error response:", errorText)
        throw new Error(`Direct import API failed with status ${directImportResponse.status}: ${errorText}`)
      }

      const directResult = await directImportResponse.json()

      if (!directResult.success || !directResult.data) {
        console.error("Direct import API returned unsuccessful result:", directResult)
        throw new Error(directResult.error || "Direct import failed")
      }

      console.log("Direct import successful, data length:", directResult.data.length)

      // 验证数据是否为有效的JSON
      try {
        JSON.parse(directResult.data)
      } catch (jsonError) {
        console.error("Retrieved data is not valid JSON:", jsonError)
        throw new Error("Retrieved data is not valid JSON")
      }

      return { data: directResult.data, success: true }
    } catch (directError) {
      console.error("Error with direct import:", directError)

      // 尝试使用原始导入方法作为备份
      try {
        console.log("Falling back to original import method")

        // 从localStorage获取auth token（如果可用）
        const authToken = localStorage.getItem("clerk-db-jwt") || "anonymous"

        // 添加时间戳以避免缓存问题
        const timestamp = Date.now()
        const apiResponse = await fetch(`/api/user-import?userId=${encodeURIComponent(userId)}&t=${timestamp}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
            "x-auth-token": authToken,
          },
        })

        console.log("API import response status:", apiResponse.status)

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text()
          console.error("API import error response:", errorText)
          throw new Error(`API import failed with status ${apiResponse.status}: ${errorText}`)
        }

        const result = await apiResponse.json()

        if (!result.success || !result.data) {
          console.error("API import returned unsuccessful result:", result)
          throw new Error(result.error || "Import failed")
        }

        console.log("API import successful, data length:", result.data.length)

        // 验证数据是否为有效的JSON
        try {
          JSON.parse(result.data)
        } catch (jsonError) {
          console.error("Retrieved data is not valid JSON:", jsonError)
          throw new Error("Retrieved data is not valid JSON")
        }

        return { data: result.data, success: true }
      } catch (apiError) {
        console.error("Original import method also failed:", apiError)
        return { data: "", success: false }
      }
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

    console.log("Checking backup for user:", userId)

    // 从localStorage获取auth token（如果可用）
    const authToken = localStorage.getItem("clerk-db-jwt") || "anonymous"

    // 添加时间戳以避免缓存问题
    const timestamp = Date.now()
    const apiResponse = await fetch(`/api/user-check?userId=${encodeURIComponent(userId)}&t=${timestamp}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "x-auth-token": authToken,
      },
    })

    console.log("API check response status:", apiResponse.status)

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      console.error("API check error response:", errorText)
      throw new Error(`API check failed with status ${apiResponse.status}: ${errorText}`)
    }

    const result = await apiResponse.json()
    console.log("API check response:", result)

    return result.exists === true
  } catch (error) {
    console.error("Error checking user backup:", error)
    return false
  }
}
