"use client"

import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import { UserNav } from "@/components/dashboard/user-nav"
import { NotificationCenter } from "@/components/notifications/notification-center"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="flex items-center justify-center rounded-md bg-primary/10 p-2">
            <span className="font-bold text-primary text-lg tracking-tight">PHYSIA</span>
          </div>
        </Link>
        <div className="flex items-center space-x-3">
          <NotificationCenter />
          <ModeToggle />
          <div className="hidden sm:block h-6 w-px bg-border/50 mx-1" />
          <UserNav />
        </div>
      </div>
    </header>
  )
}
