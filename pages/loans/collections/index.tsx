"use client"

import { Sidebar } from "@/components/sidebar"

export default function CollectionsPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-4">Collections</h1>
        <p className="text-muted-foreground">Collections page placeholder content</p>
      </div>
    </div>
  )
}
