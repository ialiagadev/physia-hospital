"use client"

import { cn } from "@/lib/utils"

interface UnreadBadgeProps {
  count: number
  variant?: "default" | "small" | "large"
  className?: string
}

export function UnreadBadge({ count, variant = "default", className }: UnreadBadgeProps) {
  if (count === 0) return null

  const displayCount = count > 99 ? "99+" : count.toString()

  const variants = {
    small: "h-4 w-4 text-xs min-w-[16px] px-1",
    default: "h-5 w-5 text-xs min-w-[20px] px-1.5",
    large: "h-6 w-6 text-sm min-w-[24px] px-2",
  }

  return (
    <span
      className={cn(
        "bg-green-500 text-white rounded-full flex items-center justify-center font-medium flex-shrink-0",
        variants[variant],
        className,
      )}
    >
      {displayCount}
    </span>
  )
}

// Componente para el badge del header principal
export function HeaderUnreadBadge({ count }: { count: number }) {
  if (count === 0) return null

  return (
    <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
      {count > 99 ? "99+" : count}
    </span>
  )
}

// Componente para indicador visual de conversación no leída
export function ConversationUnreadIndicator({ hasUnread }: { hasUnread: boolean }) {
  if (!hasUnread) return null

  return <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
}
