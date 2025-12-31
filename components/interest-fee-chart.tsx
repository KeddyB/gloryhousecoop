"use client"

import { useEffect, useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { createClient } from "@/utils/supabase/client"
import { 
  format, 
  startOfHour, 
  startOfDay, 
  startOfWeek, 
  startOfMonth, 
  startOfYear, 
  subHours, 
  subDays, 
  subWeeks, 
  subMonths, 
  subYears, 
  isAfter,
  eachHourOfInterval,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  eachYearOfInterval,
} from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Interval = "hourly" | "daily" | "weekly" | "monthly" | "yearly"

export function InterestFeeChart() {
  const [payments, setPayments] = useState<any[]>([])
  const [interval, setInterval] = useState<Interval>("monthly")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: paymentsData, error } = await supabase
        .from('interest_payments')
        .select('amount_paid, payment_date')
        .order('payment_date', { ascending: true })

      if (error) {
        console.error('Error fetching interest payments:', error)
      } else {
        setPayments(paymentsData || [])
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
    let intervalGenerator: (options: { start: Date; end: Date }) => Date[] = eachDayOfInterval;

    // 1. Configure interval settings
    switch (interval) {
      case "hourly":
        start = subHours(now, 24)
        intervalGenerator = eachHourOfInterval
        formatKey = "yyyy-MM-dd HH:mm"
        displayFormat = "HH:mm"
        break
      case "daily":
        start = subDays(now, 30)
        intervalGenerator = eachDayOfInterval
        formatKey = "yyyy-MM-dd"
        displayFormat = "MMM dd"
        break
      case "weekly":
        start = subWeeks(now, 12)
        intervalGenerator = eachWeekOfInterval
        formatKey = "yyyy-MM-dd"
        displayFormat = "MMM dd"
        break
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
    }

    // 3. Group actual payments
    const grouped = payments.reduce((acc, curr) => {
      if (!curr.payment_date) return acc
      const date = new Date(curr.payment_date)
      
      // Filter out if before start
      if (!isAfter(date, start)) return acc;

      let key = ""
      switch (interval) {
        case "hourly":
          key = format(startOfHour(date), formatKey)
          break
        case "daily":
          key = format(startOfDay(date), formatKey)
          break
        case "weekly":
          key = format(startOfWeek(date), formatKey)
          break
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
            case "hourly":
              key = format(startOfHour(date), formatKey)
              break
            case "daily":
              key = format(startOfDay(date), formatKey)
              break
            case "weekly":
              key = format(startOfWeek(date), formatKey)
              break
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
        <Card className="p-6 h-[300px] flex items-center justify-center">
             <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
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
                <SelectItem value="hourly">Hourly (24h)</SelectItem>
                <SelectItem value="daily">Daily (30d)</SelectItem>
                <SelectItem value="weekly">Weekly (12w)</SelectItem>
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
