"use client"

import { Sidebar } from "@/components/sidebar"
import { DashboardContent } from "@/components/dashboard-content"

export default function OverviewPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <DashboardContent />
    </div>
  )
}
