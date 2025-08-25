"use client"

import type React from "react"

import { Suspense } from "react"

interface GuidedTourWrapperProps {
  children: React.ReactNode
}

export function GuidedTourWrapper({ children }: GuidedTourWrapperProps) {
  return <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
}
