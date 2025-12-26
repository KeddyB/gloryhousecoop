"use client"

import { Sidebar } from "@/components/sidebar"

export default function ApplicationsPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-4">Applications</h1>
        <p className="text-muted-foreground">Applications page placeholder content</p>
      </div>
    </div>
  )
}
