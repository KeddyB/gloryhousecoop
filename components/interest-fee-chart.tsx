"use client"

import { useEffect, useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { createClient } from "@/utils/supabase/client"
import { 
  format, 
  startOfMonth, 
  startOfYear, 
  subMonths, 
  subYears, 
  isAfter,
  eachMonthOfInterval,
  eachYearOfInterval,
} from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

type Interval = "monthly" | "yearly"

interface Transaction {
  id?: string
  title?: string
  name?: string
  amount_paid: number
  status?: 'active' | 'inactive' | 'pending'
  date?: string
  created_at?: string
  type?: 'disbursement' | 'repayment' | 'interest'

  member?: {
    full_name: string
    name: string
  } | null

  loan?: {
    member: {
      full_name: string
      name: string
    }
  } | null

  payment_date?: string
  due_date?: string
  payment_for_month?: string
}


export function InterestFeeChart() {
  const [payments, setPayments] = useState<Transaction[]>([])
  const [interval, setInterval] = useState<Interval>("monthly")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: paymentsData, error } = await supabase
        .from('interest_payments')
        .select('amount_paid, payment_for_month')
        .order('payment_for_month', { ascending: true })

      if (error) {
        console.error('Error fetching interest payments:', error)
      } else {
        setPayments(paymentsData ?? [])
      }
      setIsLoading(false)
    }

    fetchData()
  }, [])

  const chartData = useMemo(() => {
    const now = new Date()
    let start = new Date()
    let formatKey = ""
    let displayFormat = ""
    let intervalGenerator: (options: { start: Date; end: Date }) => Date[] = eachMonthOfInterval;

    // 1. Configure interval settings
    switch (interval) {
      case "monthly":
        start = subMonths(now, 11) // Last 12 months
        intervalGenerator = eachMonthOfInterval
        formatKey = "yyyy-MM"
        displayFormat = "MMM"
        break
      case "yearly":
        start = subYears(now, 5)
        intervalGenerator = eachYearOfInterval
        formatKey = "yyyy"
        displayFormat = "yyyy"
        break
    }

    // 2. Generate all time buckets (skeleton)
    let timeBuckets: Date[] = []
    try {
        timeBuckets = intervalGenerator({ start, end: now })
    } catch (e) {
        timeBuckets = []
        console.error("Error generating time buckets:", e)
    }

    // 3. Group actual payments
    const grouped = payments.reduce((acc, curr) => {
      if (!curr.payment_for_month) return acc
      const date = new Date(curr.payment_for_month)
      
      // Filter out if before start
      if (!isAfter(date, start)) return acc;

      let key = ""
      switch (interval) {
        case "monthly":
          key = format(startOfMonth(date), formatKey)
          break
        case "yearly":
          key = format(startOfYear(date), formatKey)
          break
      }
      
      acc[key] = (acc[key] || 0) + Number(curr.amount_paid)
      return acc
    }, {} as Record<string, number>)

    // 4. Merge skeleton with data to fill gaps
    return timeBuckets.map(date => {
        let key = ""
        switch (interval) {
            case "monthly":
              key = format(startOfMonth(date), formatKey)
              break
            case "yearly":
              key = format(startOfYear(date), formatKey)
              break
        }

        return {
            key,
            label: format(date, displayFormat),
            collected: grouped[key] || 0
        }
    })

  }, [payments, interval])

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-8 w-[120px]" />
        </div>
        <Skeleton className="h-[300px] w-full" />
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Interest Fee Collection Trend</h2>
        <Select value={interval} onValueChange={(val: Interval) => setInterval(val)}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="monthly">Monthly (12m)</SelectItem>
                <SelectItem value="yearly">Yearly (5y)</SelectItem>
            </SelectContent>
        </Select>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis 
            dataKey="label" 
            minTickGap={30}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tickFormatter={(value) => `₦${value.toLocaleString()}`}
            width={80}
            tick={{ fontSize: 12 }}
            domain={[0, 'auto']}
          />
          <Tooltip 
             formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Collected']}
             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="collected" 
            stroke="#a855f7" 
            name="Collected" 
            strokeWidth={2} 
            activeDot={{ r: 6 }}
            dot={(props) => {
                const { cx, cy, payload } = props;
                if (!payload || payload.collected === 0) return <></>;
                return (
                  <circle cx={cx} cy={cy} r={4} fill="#a855f7" stroke="#a855f7" strokeWidth={0} />
                );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
