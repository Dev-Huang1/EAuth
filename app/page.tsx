"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import AuthCodeCard from "@/components/AuthCodeCard"
import SettingsMenu from "@/components/SettingsMenu"
import MainMenu from "@/components/MainMenu"
import { motion, AnimatePresence } from "framer-motion"
import { Moon, Sun, Plus } from "lucide-react"
import { useTheme } from "next-themes"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import BackupDialog from "@/components/BackupDialog"
import ImportDialog from "@/components/ImportDialog"
import AutoBackupConfirmDialog from "@/components/AutoBackupConfirmDialog"
import { encryptData } from "@/lib/encryption"
import { backupToBlob } from "@/lib/blob-service"

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
  const [showBackupDialog, setShowBackupDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showAutoBackupConfirm, setShowAutoBackupConfirm] = useState(false)
  const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState(false)
  const [backupPassword, setBackupPassword] = useState("")
  const [isBackingUp, setIsBackingUp] = useState(false)

  useEffect(() => {
    // 从本地存储加载数据
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

  useEffect(() => {
    // Check if auto backup is enabled
    const autoBackup = localStorage.getItem("autoBackupEnabled")
    if (autoBackup === "true") {
      setIsAutoBackupEnabled(true)

      // Get the backup password if auto backup is enabled
      const storedPassword = localStorage.getItem("backupPassword")
      if (storedPassword) {
        setBackupPassword(storedPassword)
      }
    }
  }, [])

  const performAutoBackup = useCallback(async () => {
    if (isAutoBackupEnabled && backupPassword && !isBackingUp) {
      try {
        setIsBackingUp(true)
        console.log("Performing auto backup...")
        const dataToBackup = JSON.stringify(authCodes)
        const result = await backupToBlob(dataToBackup, backupPassword)
        if (!result.success) {
          console.error("Auto backup failed")
        } else {
          console.log("Auto backup successful")
        }
      } catch (error) {
        console.error("Auto backup failed:", error)
      } finally {
        setIsBackingUp(false)
      }
    }
  }, [isAutoBackupEnabled, backupPassword, authCodes, isBackingUp])

  // Watch for changes to authCodes and trigger auto backup
  useEffect(() => {
    if (authCodes.length > 0) {
      performAutoBackup()
    }
  }, [authCodes, performAutoBackup])

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
    setAuthCodes(updatedCodes)
    localStorage.setItem("authCodes", JSON.stringify(updatedCodes))
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
    setAuthCodes(updatedCodes)
    localStorage.setItem("authCodes", JSON.stringify(updatedCodes))
  }

  const pinAuthCode = (id: string) => {
    const updatedCodes = authCodes.map((code) => (code.id === id ? { ...code, isPinned: !code.isPinned } : code))
    setAuthCodes(updatedCodes)
    localStorage.setItem("authCodes", JSON.stringify(updatedCodes))
  }

  const editAuthCode = (id: string) => {
    const codeToEdit = authCodes.find((code) => code.id === id)
    if (codeToEdit) {
      setEditingCode(codeToEdit)
      setShowSettings(true)
    }
  }

  const deleteAuthCode = (id: string) => {
    const updatedCodes = authCodes.filter((code) => code.id !== id)
    setAuthCodes(updatedCodes)
    localStorage.setItem("authCodes", JSON.stringify(updatedCodes))
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
            setAuthCodes(newAuthCodes)
            localStorage.setItem("authCodes", JSON.stringify(newAuthCodes))
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

  const addGroup = (groupName: string) => {
    if (!groups.includes(groupName)) {
      const updatedGroups = [...groups, groupName]
      setGroups(updatedGroups)
      localStorage.setItem("groups", JSON.stringify(updatedGroups))
    }
  }

  const removeGroup = (groupName: string) => {
    if (groupName !== "All") {
      const updatedGroups = groups.filter((g) => g !== groupName)
      setGroups(updatedGroups)
      localStorage.setItem("groups", JSON.stringify(updatedGroups))

      // Move auth codes from the removed group to "All"
      const updatedCodes = authCodes.map((code) => (code.group === groupName ? { ...code, group: "All" } : code))
      setAuthCodes(updatedCodes)
      localStorage.setItem("authCodes", JSON.stringify(updatedCodes))

      if (activeGroup === groupName) {
        setActiveGroup("All")
      }
    }
  }

  const sortedAuthCodes = [...authCodes].sort((a, b) => {
    if (a.isPinned === b.isPinned) {
      return a.issuer.localeCompare(b.issuer)
    }
    return a.isPinned ? -1 : 1
  })

  const handleBackup = async (password: string, hash: string) => {
    try {
      const dataToBackup = JSON.stringify(authCodes)
      const result = await backupToBlob(dataToBackup, hash)

      if (result.success) {
        setShowBackupDialog(false)
        setShowAutoBackupConfirm(true)
        // Store the password for potential auto backup
        setBackupPassword(hash)
        localStorage.setItem("backupPassword", hash)

        toast({
          title: "Backup Successful",
          description: "Your data has been backed up successfully.",
        })
      } else {
        throw new Error("Backup failed")
      }
    } catch (error) {
      toast({
        title: "Backup Failed",
        description: "There was an error backing up your data.",
        variant: "destructive",
      })
      console.error("Backup error:", error)
    }
  }

  const handleImport = async (password: string, hash: string) => {
    try {
      console.log("Starting import with hash:", hash)

      // Show loading toast
      toast({
        title: "Importing Data",
        description: "Please wait while we retrieve your data...",
      })

      // Make the API request
      const response = await fetch(`/api/import?hash=${encodeURIComponent(hash)}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      })

      console.log("Import response status:", response.status)

      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = "Import failed"

        try {
          const errorData = await response.json()
          errorMessage = errorData.error || "Import failed"
        } catch (e) {
          // If we can't parse the response as JSON, use the status text
          errorMessage = `Import failed: ${response.statusText}`
        }

        console.error("Import error:", errorMessage)

        toast({
          title: "Import Failed",
          description: errorMessage,
          variant: "destructive",
        })

        return
      }

      // Parse the response
      let result
      try {
        result = await response.json()
      } catch (e) {
        console.error("Failed to parse response as JSON:", e)
        toast({
          title: "Import Failed",
          description: "Invalid response from server",
          variant: "destructive",
        })
        return
      }

      // Check if we have data
      if (!result.data) {
        toast({
          title: "Import Failed",
          description: "No data returned from server",
          variant: "destructive",
        })
        return
      }

      // Parse the imported data
      try {
        const importedCodes = JSON.parse(result.data) as AuthCode[]
        setAuthCodes(importedCodes)
        localStorage.setItem("authCodes", JSON.stringify(importedCodes))

        // Store the password for potential auto backup
        setBackupPassword(hash)
        localStorage.setItem("backupPassword", hash)

        // Close the dialog
        setShowImportDialog(false)

        toast({
          title: "Import Successful",
          description: `Imported ${importedCodes.length} authentication codes`,
        })
      } catch (parseError) {
        console.error("Error parsing imported data:", parseError)
        toast({
          title: "Import Failed",
          description: "The imported data is not in the correct format",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Import error:", error)
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const enableAutoBackup = () => {
    setIsAutoBackupEnabled(true)
    localStorage.setItem("autoBackupEnabled", "true")
    setShowAutoBackupConfirm(false)

    toast({
      title: "Auto Backup Enabled",
      description: "Your data will be automatically backed up when changes are made.",
    })
  }

  const toggleAutoBackup = () => {
    if (isAutoBackupEnabled) {
      setIsAutoBackupEnabled(false)
      localStorage.setItem("autoBackupEnabled", "false")

      toast({
        title: "Auto Backup Disabled",
        description: "Automatic backup has been disabled.",
      })
    } else {
      if (backupPassword) {
        setIsAutoBackupEnabled(true)
        localStorage.setItem("autoBackupEnabled", "true")

        toast({
          title: "Auto Backup Enabled",
          description: "Your data will be automatically backed up when changes are made.",
        })
      } else {
        // If no backup password is set, prompt for backup first
        setShowBackupDialog(true)
      }
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
              onExport={exportData}
              onImport={importData}
              onOpenSettings={() => setShowSettings(true)}
              groups={groups}
              onAddGroup={addGroup}
              onRemoveGroup={removeGroup}
              onBackup={() => setShowBackupDialog(true)}
              onImportBackup={() => setShowImportDialog(true)}
              isAutoBackupEnabled={isAutoBackupEnabled}
              onToggleAutoBackup={toggleAutoBackup}
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
      {showBackupDialog && (
        <BackupDialog isOpen={showBackupDialog} onClose={() => setShowBackupDialog(false)} onBackup={handleBackup} />
      )}

      {showImportDialog && (
        <ImportDialog isOpen={showImportDialog} onClose={() => setShowImportDialog(false)} onImport={handleImport} />
      )}

      {showAutoBackupConfirm && (
        <AutoBackupConfirmDialog
          isOpen={showAutoBackupConfirm}
          onClose={() => setShowAutoBackupConfirm(false)}
          onConfirm={enableAutoBackup}
        />
      )}
    </div>
  )
}

