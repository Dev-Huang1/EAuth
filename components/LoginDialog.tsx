"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { SignIn } from "@clerk/nextjs"
import { Loader2 } from 'lucide-react'

interface LoginDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function LoginDialog({ isOpen, onClose }: LoginDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sign In</DialogTitle>
          <DialogDescription>
            Sign in to enable automatic backup of your authentication codes.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Card className="p-4">
            <SignIn 
              afterSignInUrl="/"
              afterSignUpUrl="/"
              signUpUrl="/sign-up"
            />
          </Card>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
