"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { useEffect, useState } from "react"
import { format } from "date-fns"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

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
          const hasDisbursementRecord = loan.disbursements && loan.disbursements.length > 0
          const isStateDisbursed = loan.state === 'active' || loan.state === 'disbursed'

          const member = Array.isArray(loan.member) ? loan.member[0] : loan.member
          const memberName = member?.full_name || member?.name || "Unknown Member"

          return {
            id: loan.id,
            name: memberName,
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
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="text-base md:text-lg font-semibold text-foreground mb-4 md:mb-6">New Applications</h2>
      {applications.length === 0 ? (
        <p className="text-muted-foreground text-xs md:text-sm">No new applications found.</p>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {applications.map((app) => {
            const dateObj = new Date(app.date)
            const dateText = !isNaN(dateObj.getTime()) ? format(dateObj, 'MMM d, yyyy') : 'Unknown date'

            return (
              <div
                key={app.id}
                className="flex items-center justify-between p-3 md:p-4 bg-background rounded-lg border border-border gap-2"
              >
                <div className="flex-1">
                  <p className="text-xs md:text-sm font-semibold text-foreground truncate">{app.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <p className="text-xs text-muted-foreground">{dateText}</p>
                    <Badge
                      variant={app.isDisbursed ? "default" : "secondary"}
                      className={`text-[9px] md:text-[10px] h-5 ${app.isDisbursed ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'}`}
                    >
                      {app.isDisbursed ? 'Disbursed' : 'Not Disbursed'}
                    </Badge>
                  </div>
                </div>
                <div className="text-right md:ml-auto">
                  {app.amount && <p className="text-xs md:text-sm font-semibold text-foreground">₦{app.amount.toLocaleString()}</p>}
                  <Link href={app.isDisbursed ? "/loans/list" : "/loans/disbursement"}>
                      <Button variant="outline" size="sm" className="mt-1 md:mt-2 bg-transparent h-7 md:h-8 text-[11px] md:text-xs">
                      {app.isDisbursed ? 'View' : 'Disburse'}
                      </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
