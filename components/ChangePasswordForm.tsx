"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import CryptoJS from "crypto-js"
import { useToast } from "@/components/ui/use-toast"

interface ChangePasswordFormProps {
  onClose: () => void
}

export default function ChangePasswordForm({ onClose }: ChangePasswordFormProps) {
  const [newPassword, setNewPassword] = useState("")
  const { toast } = useToast()

  const handleChangePassword = () => {
    if (newPassword.length === 6 && /^\d+$/.test(newPassword)) {
      const hashedPassword = CryptoJS.SHA256(newPassword).toString()
      localStorage.setItem("appPassword", hashedPassword)
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      })
      setNewPassword("")
      onClose()
    } else {
      toast({
        title: "Invalid Password",
        description: "Password must be 6 digits.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">Change Password</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              New Password
            </Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New 6-digit password"
              maxLength={6}
              pattern="\d{6}"
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            />
          </div>
          <Button onClick={handleChangePassword} className="w-full bg-accent hover:bg-accent/90 text-white">
            Change Password
          </Button>
        </div>
        <DialogFooter>
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
