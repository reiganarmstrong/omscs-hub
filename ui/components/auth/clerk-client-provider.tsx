"use client"

import { ClerkProvider } from "@clerk/react"
import { GatechSessionProvider, GuestSessionProvider } from "./gatech-session"

export function ClerkClientProvider({
  children,
  publishableKey,
}: {
  children: React.ReactNode
  publishableKey: string
}) {
  if (!publishableKey)
    return <GuestSessionProvider>{children}</GuestSessionProvider>
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <GatechSessionProvider>{children}</GatechSessionProvider>
    </ClerkProvider>
  )
}
