"use client"

import { Sidebar } from "@/components/sidebar"

export default function ApprovalPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-4">Approval</h1>
        <p className="text-muted-foreground">Approval page placeholder content</p>
      </div>
    </div>
  )
}
