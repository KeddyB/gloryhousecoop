"use client"

import * as React from "react"
import { createClient } from "@/utils/supabase/client"
import { format, subDays, startOfYear, subYears, differenceInDays, addDays } from "date-fns"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowDownFromLine,
  ArrowUpFromLine,
  TrendingUp,
} from "lucide-react"
import { DateRange } from "react-day-picker"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePickerWithRange } from "./ui/date-range-picker"

type ChartData = {
  name: string
  interestIncome: number
  disbursement: number
  repayment: number
}

type Period = "day" | "month" | "year" | "custom"

type FetchedItem = {
  created_at: string
  loan_amount?: number
  amount?: number
  amount_paid?: number
}

interface QueryBuilder<T> {
  gte(column: string, value: string): QueryBuilder<T>
  lte(column: string, value: string): QueryBuilder<T>
  then<TResult1 = { data: T[] | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T[] | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2>
}



export function AnnualDataAnalytics() {
  const [period, setPeriod] = React.useState<Period>("month")
  const [isCustomRange, setIsCustomRange] = React.useState(false)
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: startOfYear(new Date()),
    to: new Date(),
  })
  const [data, setData] = React.useState<ChartData[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedPoint, setSelectedPoint] = React.useState<ChartData | null>(null)

  React.useEffect(() => {
    setSelectedPoint(null)
  }, [period, dateRange])

  const handleDateChange = (newDateRange: DateRange | undefined) => {
    setDateRange(newDateRange)
    setPeriod("custom")
    setIsCustomRange(true)
  }

  // Handle tab changes to preset date ranges
  const handlePeriodChange = (newPeriod: string) => {
    const p = newPeriod as Period
    setPeriod(p)
    setIsCustomRange(false)
    const now = new Date()
    if (p === "day") {
      setDateRange({ from: subDays(now, 30), to: now })
    } else if (p === "month") {
      setDateRange({ from: startOfYear(now), to: now })
    } else if (p === "year") {
      setDateRange({ from: subYears(now, 5), to: now })
    }
  }

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const supabase = createClient()
        const now = new Date()

        // Default to current year if range is undefined
        const startDate = dateRange?.from || startOfYear(now)
        const endDate = dateRange?.to || now

        const isoDate = startDate.toISOString()
        const isoEndDate = endDate.toISOString()

        const queryModifier = (query: QueryBuilder<FetchedItem>) =>
          query.gte("created_at", isoDate).lte("created_at", isoEndDate)

        const [loansRes, repaymentsRes, interestsRes] = await Promise.all([
          queryModifier(supabase.from("loans").select("loan_amount, created_at")),
          queryModifier(supabase.from("payments").select("amount, created_at")),
          queryModifier(supabase.from("interest_payments").select("amount_paid, created_at")),
        ])

        const loans: FetchedItem[] = loansRes.data || []
        const repayments: FetchedItem[] = repaymentsRes.data || []
        const interests: FetchedItem[] = interestsRes.data || []

        const dataMap = new Map<string, ChartData>()

        // Initialize buckets
        if (period === "day") {
          for (let i = 29; i >= 0; i--) {
            const d = subDays(now, i)
            const key = format(d, "MMM dd")
            dataMap.set(key, { name: key, interestIncome: 0, disbursement: 0, repayment: 0 })
          }
        } else if (period === "month") {
          for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), i, 1)
            const key = format(d, "MMM")
            dataMap.set(key, { name: key, interestIncome: 0, disbursement: 0, repayment: 0 })
          }
        } else if (period === "year") {
          for (let i = 4; i >= 0; i--) {
            const d = subYears(now, i)
            const key = format(d, "yyyy")
            dataMap.set(key, { name: key, interestIncome: 0, disbursement: 0, repayment: 0 })
          }
        } else if (period === "custom" && dateRange?.from && dateRange?.to) {
          const days = differenceInDays(dateRange.to, dateRange.from) + 1
          for (let i = 0; i < days; i++) {
            const d = addDays(dateRange.from, i)
            const key = format(d, "MMM dd")
            dataMap.set(key, { name: key, interestIncome: 0, disbursement: 0, repayment: 0 })
          }
        }

        const processItem = (item: FetchedItem, type: "interest" | "disbursement" | "repayment") => {
          const date = new Date(item.created_at)
          let key = ""
          if (period === "day" || period === "custom") key = format(date, "MMM dd")
          if (period === "month") key = format(date, "MMM")
          if (period === "year") key = format(date, "yyyy")

          if (dataMap.has(key)) {
            const entry = dataMap.get(key)!
            const val = Number(item.amount || item.loan_amount || item.amount_paid || 0)
            if (type === "interest") entry.interestIncome += val
            if (type === "disbursement") entry.disbursement += val
            if (type === "repayment") entry.repayment += val
          }
        }

        loans.forEach((l) => processItem(l, "disbursement"))
        repayments.forEach((r) => processItem(r, "repayment"))
        interests.forEach((i) => processItem(i, "interest"))

        setData(Array.from(dataMap.values()))
      } catch (error) {
        console.error("Failed to fetch annual data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [period, dateRange])

  // Find the data point that corresponds to the current date/month/year
  const currentData = React.useMemo(() => {
    if (data.length === 0) return null
    const now = new Date()
    let key = ""
    if (period === "day") key = format(now, "MMM dd")
    if (period === "month") key = format(now, "MMM")
    if (period === "year") key = format(now, "yyyy")

    return data.find((d) => d.name === key) || data[data.length - 1]
  }, [data, period])

  const displayData = selectedPoint || currentData || { name: "", interestIncome: 0, disbursement: 0, repayment: 0 }

  const getDynamicTitle = (baseTitle: string) => {
    const suffix = displayData.name ? `(${displayData.name})` : ""
    return `${baseTitle} ${suffix}`
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(value)

  return (
    <div className="space-y-4 pt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Annual Data</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={period} onValueChange={handlePeriodChange}>
            <TabsList>
              <TabsTrigger value="day">Daily</TabsTrigger>
              <TabsTrigger value="month">Monthly</TabsTrigger>
              <TabsTrigger value="year">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
          <DatePickerWithRange date={dateRange} setDate={handleDateChange} />
        </div>
      </div>

      <h3 className="text-sm font-medium text-muted-foreground">Data Statistics Annually</h3>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{getDynamicTitle("Total Interest Income")}</CardTitle>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100/50">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
              ) : (
                formatCurrency(displayData.interestIncome)
              )}
            </div>
            <p className="text-xs text-muted-foreground">Income from interest charges</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{getDynamicTitle("Disbursement Output")}</CardTitle>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100/50">
              <ArrowUpFromLine className="h-6 w-6 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
              ) : (
                formatCurrency(displayData.disbursement)
              )}
            </div>
            <p className="text-xs text-muted-foreground">Total funds disbursed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{getDynamicTitle("Repayment Income")}</CardTitle>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100/50">
              <ArrowDownFromLine className="h-6 w-6 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
              ) : (
                formatCurrency(displayData.repayment)
              )}
            </div>
            <p className="text-xs text-muted-foreground">Total repayments received</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Financial Trends</CardTitle>
          <CardDescription>
            Comparative view of interest, disbursement, and repayment over the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-0">
          <div className="h-[350px] w-full">
            {isLoading ? (
              <div className="flex h-full w-full items-end justify-between gap-2 px-4 pb-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-full animate-pulse rounded-t-md bg-muted"
                    style={{ height: `${Math.random() * 60 + 20}%` }}
                  />
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  onClick={(e) => { if (e?.activePayload?.[0]) setSelectedPoint(e.activePayload[0].payload) }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₦${value / 1000}k`}
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                  />
                  <Legend />
                  <Bar cursor="pointer" dataKey="interestIncome" name="Interest Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar cursor="pointer" dataKey="disbursement" name="Disbursement" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar cursor="pointer" dataKey="repayment" name="Repayment" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}                  