"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu, FolderTree, LogIn, LogOut } from "lucide-react"
import { useTheme } from "next-themes"
import ManageGroupsDialog from "./ManageGroupsDialog"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

interface MainMenuProps {
  onOpenSettings: () => void
  groups: string[]
  onAddGroup: (groupName: string) => void
  onRemoveGroup: (groupName: string) => void
  onLogout: () => void
}

export default function MainMenu({ onOpenSettings, groups, onAddGroup, onRemoveGroup, onLogout }: MainMenuProps) {
  const [showManageGroups, setShowManageGroups] = useState(false)
  const { theme } = useTheme()
  const { isSignedIn } = useAuth()
  const router = useRouter()

  const handleLogin = () => {
    router.push("/sign-in")
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="text-gray-600 dark:text-gray-300">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Menu</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpenSettings}>
            <Menu className="mr-2 h-4 w-4" />
            <span>Add New Code</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowManageGroups(true)}>
            <FolderTree className="mr-2 h-4 w-4" />
            <span>Manage Groups</span>
          </DropdownMenuItem>

          {isSignedIn ? (
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={handleLogin}>
              <LogIn className="mr-2 h-4 w-4" />
              <span>Sign In</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {showManageGroups && (
        <ManageGroupsDialog
          groups={groups}
          onAddGroup={onAddGroup}
          onRemoveGroup={onRemoveGroup}
          onClose={() => setShowManageGroups(false)}
        />
      )}
    </>
  )
}

