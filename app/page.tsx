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

  // 备份数据到服务器
  const backupData = useCallback(async () => {
    if (!isSignedIn || !userId || isBackingUp || authCodes.length === 0) return

    try {
      setIsBackingUp(true)
      console.log("Backing up data for user:", userId)

      const response = await fetch("/api/user-backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          data: JSON.stringify(authCodes),
        }),
      })

      if (!response.ok) {
        throw new Error("Backup failed")
      }

      const result = await response.json()
      console.log("Backup successful:", result)
      lastSyncTimeRef.current = Date.now()
    } catch (error) {
      console.error("Backup error:", error)
      toast({
        title: "备份失败",
        description: "无法备份您的数据。请稍后再试。",
        variant: "destructive",
      })
    } finally {
      setIsBackingUp(false)
    }
  }, [isSignedIn, userId, isBackingUp, authCodes, toast])

  // 从服务器获取数据
  const fetchData = useCallback(async () => {
    if (!isSignedIn || !userId || isSyncing) return

    try {
      setIsSyncing(true)
      console.log("Fetching data for user:", userId)

      const response = await fetch(`/api/user-data?userId=${encodeURIComponent(userId)}`)
      if (!response.ok) {
        throw new Error("Failed to fetch data")
      }

      const result = await response.json()

      if (result.exists && result.data) {
        try {
          const parsedData = JSON.parse(result.data)
          console.log("Fetched data successfully:", parsedData.length, "items")

          // 更新本地存储
          setAuthCodes(parsedData)
          localStorage.setItem("authCodes", result.data)

          toast({
            title: "数据已同步",
            description: "您的验证码已从云端同步。",
          })

          lastSyncTimeRef.current = Date.now()
        } catch (parseError) {
          console.error("Error parsing data:", parseError)
          toast({
            title: "数据解析错误",
            description: "无法解析从服务器获取的数据。",
            variant: "destructive",
          })
        }
      } else {
        console.log("No data found for user")
        // 如果服务器上没有数据，但本地有数据，则备份本地数据
        if (authCodes.length > 0) {
          backupData()
        }
      }
    } catch (error) {
      console.error("Fetch error:", error)
      toast({
        title: "同步失败",
        description: "无法从服务器获取您的数据。",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }, [isSignedIn, userId, isSyncing, authCodes, toast, backupData])

  // 初始化用户数据
  useEffect(() => {
    if (isSignedIn && userId && !hasInitializedRef.current) {
      hasInitializedRef.current = true

      // 获取用户数据
      fetchData()

      // 设置定期同步
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }

      syncIntervalRef.current = setInterval(() => {
        // 每30分钟同步一次
        if (Date.now() - lastSyncTimeRef.current > 30 * 60 * 1000) {
          fetchData()
        }
      }, 60000) // 每分钟检查一次
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [isSignedIn, userId, fetchData])

  // 处理数据变更
  const handleDataChange = useCallback(
    (newCodes: AuthCode[]) => {
      setAuthCodes(newCodes)
      localStorage.setItem("authCodes", JSON.stringify(newCodes))

      // 如果已登录，备份数据
      if (isSignedIn && userId) {
        backupData()
      }
    },
    [isSignedIn, userId, backupData],
  )

  // 处理分组变更
  const handleGroupChange = useCallback((newGroups: string[]) => {
    setGroups(newGroups)
    localStorage.setItem("groups", JSON.stringify(newGroups))
  }, [])

  const handleLogout = async () => {
    // 退出前备份数据
    if (isSignedIn && userId) {
      await backupData()
    }

    // 清除同步定时器
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
      syncIntervalRef.current = null
    }

    // 重置初始化标志
    hasInitializedRef.current = false

    await signOut()
    toast({
      title: "已退出登录",
      description: "您已成功退出登录。",
    })
  }

  const addAuthCode = (issuer: string, account: string, secret: string, group: string, service: string) => {
    // 生成随机密钥用于加密
    const encryptionKey = Math.random().toString(36).substring(2, 15)

    // 加密密钥
    const encryptedSecret = encryptData(secret, encryptionKey)

    // 存储加密密钥和加密后的密钥
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
      // 检查密钥是否已更改
      if (existingCode.secret !== updatedCode.secret) {
        // 生成新的加密密钥
        const encryptionKey = Math.random().toString(36).substring(2, 15)

        // 加密新密钥
        const encryptedSecret = encryptData(updatedCode.secret, encryptionKey)

        // 更新密钥
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

      // 将被删除分组中的验证码移到"All"分组
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
              title: "导入成功",
              description: "您的验证码已成功导入。",
            })
          } else {
            throw new Error("Invalid file format")
          }
        } catch (error) {
          toast({
            title: "导入失败",
            description: "导入验证码时出错。",
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
