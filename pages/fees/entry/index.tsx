"use client"

import { Sidebar } from "@/components/sidebar"

export default function FeeEntryPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-4">Fee Entry</h1>
        <p className="text-muted-foreground">Fee entry page placeholder content</p>
      </div>
    </div>
  )
}
