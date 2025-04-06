"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { hashPassword } from "@/lib/encryption"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"

interface BackupDialogProps {
  isOpen: boolean
  onClose: () => void
  onBackup: (password: string, hash: string) => Promise<void>
}

export default function BackupDialog({ isOpen, onClose, onBackup }: BackupDialogProps) {
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  const handleBackup = async () => {
    if (!password) {
      setError("Please enter a password to secure your backup.")
      return
    }

    setError("")
    setIsLoading(true)
    try {
      const hash = hashPassword(password)
      await onBackup(password, hash)
      setPassword("")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Backup failed. Please try again.")
      toast({
        title: "Backup Failed",
        description: "There was an error backing up your data.",
        variant: "destructive",
      })
      console.error("Backup error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Backup Your Data</DialogTitle>
          <DialogDescription>
            Enter a password to secure your backup. You'll need this password to restore your data later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="backup-password" className="text-right">
              Password
            </Label>
            <Input
              id="backup-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError("")
              }}
              className={`col-span-3 ${error ? "border-red-500" : ""}`}
              placeholder="Enter a secure password"
            />
          </div>
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={handleBackup} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Backing up...
                </>
              ) : (
                "Backup"
              )}
            </Button>
          </motion.div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

