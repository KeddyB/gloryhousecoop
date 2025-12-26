"use client"

import { Sidebar } from "@/components/sidebar"

export default function AppSettingsPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-4">App Settings</h1>
        <p className="text-muted-foreground">App settings page placeholder content</p>
      </div>
    </div>
  )
}
