"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { useEffect, useState } from "react"
import { format } from "date-fns"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

interface Application {
  id: string
  name: string
  date: string
  amount: number
  isDisbursed: boolean
}

export function NewApplications() {
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchApplications = async () => {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('loans')
        .select(`
          id,
          loan_amount,
          created_at,
          state,
          member:members(name, full_name),
          disbursements(id)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error("Error fetching applications:", error)
      } else {
        const mappedApps: Application[] = (data || []).map(loan => {
          // Check if disbursed:
          // 1. Check if disbursements array is not empty (eager loaded relationship)
          // 2. OR check if loan state is 'active' or 'disbursed'
          const hasDisbursementRecord = loan.disbursements && loan.disbursements.length > 0;
          const isStateDisbursed = loan.state === 'active' || loan.state === 'disbursed';
          
          return {
            id: loan.id,
            name: loan.member?.full_name || loan.member?.name || "Unknown Member",
            date: loan.created_at,
            amount: loan.loan_amount,
            isDisbursed: hasDisbursementRecord || isStateDisbursed
          }
        })
        setApplications(mappedApps)
      }
      setIsLoading(false)
    }

    fetchApplications()
  }, [])

  if (isLoading) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">New Applications</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">New Applications</h2>
      {applications.length === 0 ? (
        <p className="text-muted-foreground text-sm">No new applications found.</p>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="flex items-center justify-between p-4 bg-background rounded-lg border border-border"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{app.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">{format(new Date(app.date), 'MMM d, yyyy')}</p>
                  <Badge variant={app.isDisbursed ? "default" : "secondary"} className={`text-[10px] h-5 ${app.isDisbursed ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'}`}>
                    {app.isDisbursed ? 'Disbursed' : 'Not Disbursed'}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                {app.amount && <p className="text-sm font-semibold text-foreground">₦{app.amount.toLocaleString()}</p>}
                <Link href={app.isDisbursed ? "/loans/list" : "/loans/disbursement"}>
                    <Button variant="outline" size="sm" className="mt-2 bg-transparent h-8 text-xs">
                    {app.isDisbursed ? 'View' : 'Disburse'}
                    </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
