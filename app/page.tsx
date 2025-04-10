"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import AuthCodeCard from "@/components/AuthCodeCard"
import SettingsMenu from "@/components/SettingsMenu"
import MainMenu from "@/components/MainMenu"
import { motion, AnimatePresence } from "framer-motion"
import { Moon, Sun, Plus } from "lucide-react"
import { useTheme } from "next-themes"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { encryptData } from "@/lib/encryption"
import { backupToBlob, importFromBlob, checkUserBackup } from "@/lib/blob-service"
import { useAuth } from "@clerk/nextjs"

interface AuthCode {
  id: string
  issuer: string
  account: string
  secret: string // This will be encrypted when stored
  isPinned: boolean
  group: string
  service: string
}

export default function Home() {
  const [authCodes, setAuthCodes] = useState<AuthCode[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [groups, setGroups] = useState<string[]>(["All"])
  const [activeGroup, setActiveGroup] = useState("All")
  const [editingCode, setEditingCode] = useState<AuthCode | null>(null)
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const { isSignedIn, userId, getToken, signOut } = useAuth()
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastSyncTimeRef = useRef<number>(0)
  const hasInitializedRef = useRef<boolean>(false)

  // Store Clerk JWT in localStorage when user signs in
  useEffect(() => {
    const storeToken = async () => {
      if (isSignedIn && getToken) {
        try {
          const token = await getToken()
          if (token) {
            localStorage.setItem("clerk-db-jwt", token)
            console.log("Stored Clerk JWT in localStorage")
          }
        } catch (error) {
          console.error("Failed to get token:", error)
        }
      }
    }

    storeToken()
  }, [isSignedIn, getToken])

  // Load data from localStorage
  useEffect(() => {
    const storedCodes = localStorage.getItem("authCodes")
    if (storedCodes) {
      try {
        setAuthCodes(JSON.parse(storedCodes))
      } catch (e) {
        console.error("Failed to parse stored auth codes:", e)
      }
    }

    const storedGroups = localStorage.getItem("groups")
    if (storedGroups) {
      try {
        setGroups(JSON.parse(storedGroups))
      } catch (e) {
        console.error("Failed to parse stored groups:", e)
      }
    }
  }, [])

  // Backup function
  const performBackup = useCallback(async () => {
    if (isSignedIn && userId && !isBackingUp && authCodes.length > 0) {
      try {
        setIsBackingUp(true)
        console.log("Performing backup for user:", userId, "Auth codes count:", authCodes.length)
        const dataToBackup = JSON.stringify(authCodes)
        console.log("Data prepared for backup, length:", dataToBackup.length)

        const result = await backupToBlob(dataToBackup, userId)

        if (!result.success) {
          console.error("Backup failed")
          toast({
            title: "Backup Failed",
            description: "There was an error backing up your data. Please try again.",
            variant: "destructive",
          })
        } else {
          console.log("Backup successful")
          // Update last sync time to avoid immediate sync after backup
          lastSyncTimeRef.current = Date.now()
        }
      } catch (error) {
        console.error("Backup failed:", error)
        toast({
          title: "Backup Error",
          description: error instanceof Error ? error.message : "Unknown error during backup",
          variant: "destructive",
        })
      } finally {
        setIsBackingUp(false)
      }
    } else {
      console.log("Skipping backup:", {
        isSignedIn,
        hasUserId: !!userId,
        isBackingUp,
        authCodesCount: authCodes.length,
      })
    }
  }, [isSignedIn, userId, authCodes, isBackingUp, toast])

  // Sync function
  const syncData = useCallback(async () => {
    if (isSignedIn && userId && !isSyncing) {
      // Only sync if it's been more than 20 seconds since last sync
      const now = Date.now()
      if (now - lastSyncTimeRef.current > 20000) {
        try {
          setIsSyncing(true)
          console.log("Syncing data for user:", userId)

          const result = await importFromBlob(userId)

          if (result.success && result.data) {
            try {
              const importedCodes = JSON.parse(result.data) as AuthCode[]

              // Only update if we have data to import and it's different from what we have
              if (importedCodes.length > 0) {
                const currentCodesJson = JSON.stringify(authCodes)
                const importedCodesJson = JSON.stringify(importedCodes)

                if (currentCodesJson !== importedCodesJson) {
                  console.log("Data changed, updating local storage")
                  setAuthCodes(importedCodes)
                  localStorage.setItem("authCodes", result.data)
                } else {
                  console.log("Data unchanged, no update needed")
                }
              }

              lastSyncTimeRef.current = now
            } catch (parseError) {
              console.error("Error parsing imported data:", parseError)
            }
          }
        } catch (error) {
          console.error("Error syncing data:", error)
        } finally {
          setIsSyncing(false)
        }
      }
    }
  }, [isSignedIn, userId, isSyncing, authCodes])

  // Initialize when user signs in
  useEffect(() => {
    const initializeUser = async () => {
      if (isSignedIn && userId && !hasInitializedRef.current) {
        hasInitializedRef.current = true

        try {
          console.log("Initializing user:", userId)
          setIsSyncing(true)

          // 检查用户是否有备份
          try {
            console.log("Checking if user has backup")
            const hasBackup = await checkUserBackup(userId)
            console.log("User has backup:", hasBackup)

            if (hasBackup) {
              // 用户有备份，下载它
              console.log("User has existing backup, downloading...")
              try {
                const result = await importFromBlob(userId)

                if (result.success && result.data) {
                  try {
                    console.log("Successfully imported data, length:", result.data.length)
                    const importedCodes = JSON.parse(result.data) as AuthCode[]
                    console.log("Parsed imported codes, count:", importedCodes.length)

                    // 更新本地数据
                    setAuthCodes(importedCodes)
                    localStorage.setItem("authCodes", result.data)

                    // 更新最后同步时间
                    lastSyncTimeRef.current = Date.now()

                    toast({
                      title: "数据已恢复",
                      description: "您的验证码已从备份中恢复。",
                    })
                  } catch (parseError) {
                    console.error("Error parsing imported data:", parseError)
                    toast({
                      title: "导入错误",
                      description: "解析导入的数据时出错。",
                      variant: "destructive",
                    })
                  }
                } else {
                  console.error("Failed to import data:", result)
                  toast({
                    title: "导入失败",
                    description: "无法从备份中恢复数据。请尝试手动导入。",
                    variant: "destructive",
                  })
                }
              } catch (importError) {
                console.error("Error during import:", importError)
                toast({
                  title: "导入错误",
                  description: "导入数据时发生错误。请尝试手动导入。",
                  variant: "destructive",
                })
              }
            } else {
              // 新用户，如果有的话，备份当前数据
              console.log("New user, backing up current data if any...")
              if (authCodes.length > 0) {
                await performBackup()
              }
            }
          } catch (checkError) {
            console.error("Error checking for backup:", checkError)
            toast({
              title: "检查备份错误",
              description: "检查备份时发生错误。将使用本地数据。",
              variant: "destructive",
            })
          }

          // 设置同步间隔
          if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current)
          }

          syncIntervalRef.current = setInterval(() => {
            syncData()
          }, 30000) // 每30秒同步一次
        } catch (error) {
          console.error("Error initializing user:", error)
          toast({
            title: "初始化错误",
            description: "初始化用户数据时出错。将使用本地数据。",
            variant: "destructive",
          })
        } finally {
          setIsSyncing(false)
        }
      }
    }

    initializeUser()

    // 在卸载或用户退出登录时清理
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
    }
  }, [isSignedIn, userId, authCodes, performBackup, syncData, toast])

  // Handle data changes and trigger backup
  const handleDataChange = useCallback(
    (newCodes: AuthCode[]) => {
      setAuthCodes(newCodes)
      localStorage.setItem("authCodes", JSON.stringify(newCodes))

      // Trigger backup if signed in
      if (isSignedIn && userId) {
        performBackup()
      }
    },
    [isSignedIn, userId, performBackup],
  )

  // Handle group changes and trigger backup
  const handleGroupChange = useCallback(
    (newGroups: string[]) => {
      setGroups(newGroups)
      localStorage.setItem("groups", JSON.stringify(newGroups))

      // Trigger backup if signed in
      if (isSignedIn && userId) {
        performBackup()
      }
    },
    [isSignedIn, userId, performBackup],
  )

  const handleLogout = async () => {
    // Backup data before signing out
    if (isSignedIn && userId) {
      await performBackup()
    }

    // Clear sync interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
      syncIntervalRef.current = null
    }

    // Reset initialization flag
    hasInitializedRef.current = false

    await signOut()
    toast({
      title: "Signed Out",
      description: "You have been signed out.",
    })
  }

  const addAuthCode = (issuer: string, account: string, secret: string, group: string, service: string) => {
    // Generate a random key for encrypting this specific secret
    const encryptionKey = Math.random().toString(36).substring(2, 15)

    // Encrypt the secret
    const encryptedSecret = encryptData(secret, encryptionKey)

    // Store the encryption key in the secret field, separated by a delimiter
    const storedSecret = `${encryptionKey}:${encryptedSecret}`

    const newCode: AuthCode = {
      id: Date.now().toString(),
      issuer,
      account,
      secret: storedSecret,
      isPinned: false,
      group,
      service,
    }

    const updatedCodes = [...authCodes, newCode]
    handleDataChange(updatedCodes)
  }

  const updateAuthCode = (updatedCode: AuthCode) => {
    const existingCode = authCodes.find((code) => code.id === updatedCode.id)

    if (existingCode) {
      // Check if the secret has changed
      if (existingCode.secret !== updatedCode.secret) {
        // Generate a new encryption key
        const encryptionKey = Math.random().toString(36).substring(2, 15)

        // Encrypt the new secret
        const encryptedSecret = encryptData(updatedCode.secret, encryptionKey)

        // Update the secret with the new key and encrypted value
        updatedCode.secret = `${encryptionKey}:${encryptedSecret}`
      }
    }

    const updatedCodes = authCodes.map((code) => (code.id === updatedCode.id ? updatedCode : code))
    handleDataChange(updatedCodes)
  }

  const pinAuthCode = (id: string) => {
    const updatedCodes = authCodes.map((code) => (code.id === id ? { ...code, isPinned: !code.isPinned } : code))
    handleDataChange(updatedCodes)
  }

  const deleteAuthCode = (id: string) => {
    const updatedCodes = authCodes.filter((code) => code.id !== id)
    handleDataChange(updatedCodes)
  }

  const addGroup = (groupName: string) => {
    if (!groups.includes(groupName)) {
      const updatedGroups = [...groups, groupName]
      handleGroupChange(updatedGroups)
    }
  }

  const removeGroup = (groupName: string) => {
    if (groupName !== "All") {
      const updatedGroups = groups.filter((g) => g !== groupName)
      handleGroupChange(updatedGroups)

      // Move auth codes from the removed group to "All"
      const updatedCodes = authCodes.map((code) => (code.group === groupName ? { ...code, group: "All" } : code))
      handleDataChange(updatedCodes)

      if (activeGroup === groupName) {
        setActiveGroup("All")
      }
    }
  }

  const exportData = () => {
    const exportData = {
      version: 1,
      tokens: authCodes.map((code) => ({
        issuer: code.issuer,
        account: code.account,
        secret: code.secret,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        type: "TOTP",
        group: code.group,
        service: code.service,
      })),
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData))
    const downloadAnchorNode = document.createElement("a")
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "2fa_auth_export.json")
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        try {
          const importedData = JSON.parse(content)
          if (importedData.version === 1 && Array.isArray(importedData.tokens)) {
            const newAuthCodes = importedData.tokens.map((token: any) => ({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              issuer: token.issuer,
              account: token.account,
              secret: token.secret,
              isPinned: false,
              group: token.group || "All",
              service: token.service || "",
            }))
            handleDataChange(newAuthCodes)
            toast({
              title: "Import Successful",
              description: "Your auth codes have been imported.",
            })
          } else {
            throw new Error("Invalid file format")
          }
        } catch (error) {
          toast({
            title: "Import Failed",
            description: "There was an error importing your auth codes.",
            variant: "destructive",
          })
        }
      }
      reader.readAsText(file)
    }
  }

  const sortedAuthCodes = [...authCodes].sort((a, b) => {
    if (a.isPinned === b.isPinned) {
      return a.issuer.localeCompare(b.issuer)
    }
    return a.isPinned ? -1 : 1
  })

  const editAuthCode = (id: string) => {
    const codeToEdit = authCodes.find((code) => code.id === id)
    if (codeToEdit) {
      setEditingCode(codeToEdit)
      setShowSettings(true)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">2FA Auth App</h1>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-gray-600 dark:text-gray-300"
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            <MainMenu
              onOpenSettings={() => setShowSettings(true)}
              groups={groups}
              onAddGroup={addGroup}
              onRemoveGroup={removeGroup}
              onLogout={handleLogout}
              onExport={exportData}
              onImport={importData}
            />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <Button
            onClick={() => setShowSettings(true)}
            variant="outline"
            className="text-accent hover:text-accent-foreground"
          >
            <Plus className="mr-2 h-4 w-4" /> Add New Code
          </Button>
        </div>
        <Tabs value={activeGroup} onValueChange={setActiveGroup} className="mb-6">
          <TabsList>
            {groups.map((group) => (
              <TabsTrigger key={group} value={group}>
                {group}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <AnimatePresence>
          <motion.div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.05,
                },
              },
            }}
          >
            {sortedAuthCodes
              .filter((code) => activeGroup === "All" || code.group === activeGroup)
              .map((code) => (
                <motion.div
                  key={code.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <AuthCodeCard
                    id={code.id}
                    issuer={code.issuer}
                    account={code.account}
                    secret={code.secret}
                    isPinned={code.isPinned}
                    service={code.service}
                    onPin={pinAuthCode}
                    onEdit={editAuthCode}
                    onDelete={deleteAuthCode}
                  />
                </motion.div>
              ))}
          </motion.div>
        </AnimatePresence>
      </main>
      {showSettings && (
        <SettingsMenu
          onClose={() => {
            setShowSettings(false)
            setEditingCode(null)
          }}
          onAddCode={addAuthCode}
          onUpdateCode={updateAuthCode}
          groups={groups}
          editingCode={editingCode}
        />
      )}
    </div>
  )
}
