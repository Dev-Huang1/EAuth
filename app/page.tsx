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
import { encryptData } from "@/lib/encryption"
import { backupToBlob, importFromBlob } from "@/lib/blob-service"
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
  const { isSignedIn, userId, signOut } = useAuth()
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [hasAttemptedSync, setHasAttemptedSync] = useState(false)

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
    if (isSignedIn && !isBackingUp && authCodes.length > 0) {
      try {
        setIsBackingUp(true)
        console.log("Performing backup...")
        const dataToBackup = JSON.stringify(authCodes)
        const result = await backupToBlob(dataToBackup)
        if (!result.success) {
          console.error("Backup failed")
        } else {
          console.log("Backup successful")
        }
      } catch (error) {
        console.error("Backup failed:", error)
      } finally {
        setIsBackingUp(false)
      }
    }
  }, [isSignedIn, authCodes, isBackingUp])

  // Sync data when user signs in
  useEffect(() => {
    const syncData = async () => {
      if (isSignedIn && userId && !hasAttemptedSync) {
        setHasAttemptedSync(true)
        try {
          console.log("Attempting to sync data for signed-in user")
          const result = await importFromBlob()

          if (result.success && result.data) {
            try {
              const importedCodes = JSON.parse(result.data) as AuthCode[]

              // Only update if we have data to import
              if (importedCodes.length > 0) {
                setAuthCodes(importedCodes)
                localStorage.setItem("authCodes", JSON.stringify(importedCodes))

                toast({
                  title: "Data Synced",
                  description: `Imported ${importedCodes.length} authentication codes from your backup`,
                })
              } else {
                // If no data in the cloud but we have local data, back it up
                if (authCodes.length > 0) {
                  await performBackup()
                }
              }
            } catch (parseError) {
              console.error("Error parsing imported data:", parseError)
              // If sync fails but we have local data, back it up
              if (authCodes.length > 0) {
                await performBackup()
              }
            }
          } else {
            // If no data in the cloud but we have local data, back it up
            if (authCodes.length > 0) {
              await performBackup()
            }
          }
        } catch (error) {
          console.error("Error syncing data:", error)
          // If sync fails but we have local data, back it up
          if (authCodes.length > 0) {
            await performBackup()
          }
        }
      }
    }

    syncData()
  }, [isSignedIn, userId, authCodes, performBackup, hasAttemptedSync, toast])

  // Handle data changes and trigger backup
  const handleDataChange = useCallback(
    (newCodes: AuthCode[]) => {
      setAuthCodes(newCodes)
      localStorage.setItem("authCodes", JSON.stringify(newCodes))

      // Trigger backup if signed in
      if (isSignedIn) {
        performBackup()
      }
    },
    [isSignedIn, performBackup],
  )

  const handleLogout = async () => {
    // Backup data before signing out
    if (isSignedIn) {
      await performBackup()
    }
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

