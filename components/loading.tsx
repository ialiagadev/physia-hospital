"use client"

import Image from "next/image"

interface LoadingProps {
  size?: "sm" | "md" | "lg"
  text?: string
  className?: string
}

export default function Loading({ size = "md", text = "Cargando...", className = "" }: LoadingProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  }

  const imageSize = {
    sm: 32,
    md: 64,
    lg: 96,
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <Image
       src="/images/logo.jpeg"
        alt="Loading"
        width={imageSize[size]}
        height={imageSize[size]}
        className={`${sizeClasses[size]} animate-float`}
        priority
      />
      {text && <p className="text-slate-600 text-sm font-medium">{text}</p>}
    </div>
  )
}
