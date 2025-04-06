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

interface ImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (password: string, hash: string) => Promise<void>
}

export default function ImportDialog({ isOpen, onClose, onImport }: ImportDialogProps) {
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  const handleImport = async () => {
    if (!password) {
      setError("Please enter the password you used for backup.")
      return
    }

    setError("")
    setIsLoading(true)

    try {
      const hash = hashPassword(password)
      await onImport(password, hash)
      setPassword("")
      // Note: We don't close the dialog here - that will be handled by the parent component
      // if the import is successful
    } catch (error) {
      setError(error instanceof Error ? error.message : "Import failed. Please check your password and try again.")
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "There was an error importing your data.",
        variant: "destructive",
      })
      console.error("Import error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Your Data</DialogTitle>
          <DialogDescription>Enter the password you used when backing up your data.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="import-password" className="text-right">
              Password
            </Label>
            <Input
              id="import-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError("")
              }}
              className={`col-span-3 ${error ? "border-red-500" : ""}`}
              placeholder="Enter your backup password"
            />
          </div>
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={handleImport} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import"
              )}
            </Button>
          </motion.div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

