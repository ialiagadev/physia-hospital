"use client"

import { useState, useEffect } from "react"

export function useCountAnimation(
  endValue: number,
  duration = 800,
  startValue = 0,
  formatter?: (value: number) => string | number,
) {
  const [count, setCount] = useState(startValue)

  useEffect(() => {
    // Reset to start value when end value changes
    setCount(startValue)

    if (endValue === startValue) return

    const startTime = performance.now()
    let animationFrameId: number

    const updateCount = (currentTime: number) => {
      const elapsedTime = currentTime - startTime
      const progress = Math.min(elapsedTime / duration, 1)

      // Use easeOutExpo for a quick start and smooth finish
      const easeOutExpo = 1 - Math.pow(2, -10 * progress)

      const nextCount = startValue + (endValue - startValue) * easeOutExpo
      setCount(nextCount)

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCount)
      } else {
        setCount(endValue) // Ensure we end at exactly the target value
      }
    }

    animationFrameId = requestAnimationFrame(updateCount)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [endValue, duration, startValue])

  return formatter ? formatter(count) : count
}
