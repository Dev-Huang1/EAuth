"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import CryptoJS from "crypto-js"
import AuthCodeCard from "@/components/AuthCodeCard"
import PasswordPrompt from "@/components/PasswordPrompt"
import SettingsMenu from "@/components/SettingsMenu"
import MainMenu from "@/components/MainMenu"
import { motion, AnimatePresence } from "framer-motion"
import { Moon, Sun, Plus } from "lucide-react"
import { useTheme } from "next-themes"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AuthCode {
  id: string
  issuer: string
  account: string
  secret: string
  isPinned: boolean
  group: string
}

export default function Home() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authCodes, setAuthCodes] = useState<AuthCode[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [groups, setGroups] = useState<string[]>(["All"])
  const [activeGroup, setActiveGroup] = useState("All")
  const [editingCode, setEditingCode] = useState<AuthCode | null>(null) // Added state for editing
  const { toast } = useToast()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const initialized = localStorage.getItem("initialized")
    if (!initialized) {
      router.push("/init")
    } else {
      setIsInitialized(true)
    }
  }, [router])

  useEffect(() => {
    if (isInitialized) {
      const storedCodes = localStorage.getItem("authCodes")
      if (storedCodes) {
        setAuthCodes(JSON.parse(decryptData(storedCodes)))
      }
      const storedGroups = localStorage.getItem("groups")
      if (storedGroups) {
        setGroups(JSON.parse(decryptData(storedGroups)))
      }
    }
  }, [isInitialized])

  const encryptData = (data: string): string => {
    const password = localStorage.getItem("appPassword")
    return CryptoJS.AES.encrypt(data, password!).toString()
  }

  const decryptData = (data: string): string => {
    const password = localStorage.getItem("appPassword")
    const bytes = CryptoJS.AES.decrypt(data, password!)
    return bytes.toString(CryptoJS.enc.Utf8)
  }

  const handleAuthentication = (password: string) => {
    const storedPassword = localStorage.getItem("appPassword")
    if (storedPassword === CryptoJS.SHA256(password).toString()) {
      setIsAuthenticated(true)
    } else {
      toast({
        title: "Authentication Failed",
        description: "Incorrect password. Please try again.",
        variant: "destructive",
      })
    }
  }

  const addAuthCode = (issuer: string, account: string, secret: string, group: string) => {
    const newCode: AuthCode = { id: Date.now().toString(), issuer, account, secret, isPinned: false, group }
    const updatedCodes = [...authCodes, newCode]
    setAuthCodes(updatedCodes)
    localStorage.setItem("authCodes", encryptData(JSON.stringify(updatedCodes)))
  }

  const pinAuthCode = (id: string) => {
    const updatedCodes = authCodes.map((code) => (code.id === id ? { ...code, isPinned: !code.isPinned } : code))
    setAuthCodes(updatedCodes)
    localStorage.setItem("authCodes", encryptData(JSON.stringify(updatedCodes)))
  }

  const editAuthCode = (id: string) => {
    const codeToEdit = authCodes.find((code) => code.id === id)
    if (codeToEdit) {
      setShowSettings(true)
      setEditingCode(codeToEdit)
    }
  }

  const deleteAuthCode = (id: string) => {
    const updatedCodes = authCodes.filter((code) => code.id !== id)
    setAuthCodes(updatedCodes)
    localStorage.setItem("authCodes", encryptData(JSON.stringify(updatedCodes)))
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
      })),
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData))
    const downloadAnchorNode = document.createElement("a")
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "EAuth_export.json")
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
              group: "All", // Assign to default group on import
            }))
            setAuthCodes(newAuthCodes)
            localStorage.setItem("authCodes", encryptData(JSON.stringify(newAuthCodes)))
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
      setGroups([...groups, groupName])
      localStorage.setItem("groups", encryptData(JSON.stringify([...groups, groupName])))
    }
  }

  const removeGroup = (groupName: string) => {
    if (groupName !== "All") {
      const updatedGroups = groups.filter((g) => g !== groupName)
      setGroups(updatedGroups)
      localStorage.setItem("groups", encryptData(JSON.stringify(updatedGroups)))

      // Move auth codes from the removed group to "All"
      const updatedCodes = authCodes.map((code) => (code.group === groupName ? { ...code, group: "All" } : code))
      setAuthCodes(updatedCodes)
      localStorage.setItem("authCodes", encryptData(JSON.stringify(updatedCodes)))

      if (activeGroup === groupName) {
        setActiveGroup("All")
      }
    }
  }

  if (!isInitialized) {
    return null // or a loading indicator
  }

  if (!isAuthenticated) {
    return <PasswordPrompt onAuthenticate={handleAuthentication} />
  }

  const sortedAuthCodes = [...authCodes].sort((a, b) => {
    if (a.isPinned === b.isPinned) {
      return a.issuer.localeCompare(b.issuer)
    }
    return a.isPinned ? -1 : 1
  })

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
            <MainMenu onExport={exportData} onImport={importData} onOpenSettings={() => setShowSettings(true)} />
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
          onUpdateCode={(updatedCode) => {
            const updatedCodes = authCodes.map((code) => (code.id === updatedCode.id ? updatedCode : code))
            setAuthCodes(updatedCodes)
            localStorage.setItem("authCodes", encryptData(JSON.stringify(updatedCodes)))
            setEditingCode(null)
          }}
          groups={groups}
          onAddGroup={addGroup}
          onRemoveGroup={removeGroup}
          editingCode={editingCode}
        />
      )}
    </div>
  )
}
