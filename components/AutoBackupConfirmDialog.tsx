"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface AutoBackupConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function AutoBackupConfirmDialog({ isOpen, onClose, onConfirm }: AutoBackupConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enable Auto Backup?</AlertDialogTitle>
          <AlertDialogDescription>
            Would you like to enable automatic backup for your authentication codes? Your data will be automatically
            backed up whenever changes are made.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No, Thanks</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Enable Auto Backup</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

