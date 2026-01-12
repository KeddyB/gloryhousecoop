"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from "recharts"
import { createClient } from "@/utils/supabase/client"
import { isBefore, startOfMonth, addMonths, isSameMonth } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty"

interface InterestPayment {
  id: string;
  amount_paid: number;
  payment_for_month: string;
  payment_date: string;
}

interface Repayment {
  status: string;
  due_date: string | null;
}

interface LoanWithMember {

  id: string;

  loan_amount: number;

  interest_rate: number;

  tenure: number;

  created_at: string;

  disbursed_at?: string;

  state: string;

  member: {

    id: string;

    member_id: string;

    name: string;

    full_name: string;

    phone: string;

    avatar_url?: string;

  };

  interest_payments: InterestPayment[];

  disbursements?: { created_at: string }[];

}



interface ChartData {

  name: string;

  value: number;

  color: string;

}



const getLoanStartDate = (loan: LoanWithMember) => {
  const disbursedDate = loan.disbursements?.[0]?.created_at || loan.created_at;
  return addMonths(new Date(disbursedDate), 1);
};

const getLoanEndDate = (loan: LoanWithMember) => {
  const startDate = getLoanStartDate(loan);
  return addMonths(startDate, loan.tenure);
};

const getUnpaidMonths = (loan: LoanWithMember) => {
  const startDue = getLoanStartDate(loan);
  const endDate = getLoanEndDate(loan);
  const now = new Date();
  const unpaidMonths: Date[] = [];
  
  let iterDate = startOfMonth(startDue);
  const currentMonthStart = startOfMonth(now);

  if (isBefore(currentMonthStart, iterDate)) {
     return [];
  }

  let calculationLimit = endDate; // Extend calculation to loan end date
  
  if (isBefore(endDate, calculationLimit)) {
     calculationLimit = endDate;
  }

  while (isBefore(iterDate, calculationLimit)) {
    const isPaid = loan.interest_payments.some(p => 
      isSameMonth(new Date(p.payment_for_month), iterDate)
    );

    if (!isPaid) {
      unpaidMonths.push(new Date(iterDate));
    }
    iterDate = addMonths(iterDate, 1);
  }

  return unpaidMonths;
};

export function LoanStatusChart() {
  const [data, setData] = useState<ChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      
      // 1. Active: Total active users (Members)
      const { count: activeCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // 2. Paid: Loans with completed payment (Loans closed/paid)
      const { count: fullyPaidLoansCount } = await supabase
        .from('loans')
        .select('*', { count: 'exact', head: true })
        .or('state.eq.closed,state.eq.paid')

      // 3. Repayments data (Paid, Overdue, Pending)
      const { data: repaymentsData } = await supabase
        .from('repayments')
        .select('status, due_date')
        
      let repaymentOverdueCount = 0
      
      const now = new Date()

      repaymentsData?.forEach((r: Repayment) => {
        if (r.status === 'overdue') {
            repaymentOverdueCount++
        } else if (r.status === 'pending') {
             if (r.due_date && isBefore(new Date(r.due_date), now)) {
                 repaymentOverdueCount++
             }
        }
      })

      const { count: repaymentPendingCount } = await supabase
        .from('repayments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')


      // 4. Overdue & Pending Interest: From Loans and Interest Payments
      const { data: activeLoansData, error: loansError } = await supabase
        .from('loans')
        .select(`
          id,
          loan_amount,
          interest_rate,
          tenure,
          created_at,
          state,
          disbursements (
            created_at
          ),
          interest_payments (
            id,
            amount_paid,
            payment_for_month,
            payment_date
          )
        `)
        .or('state.eq.active,state.eq.disbursed');

      if (loansError) {
        console.error("Error fetching active loans for interest chart:", loansError);
        // Continue with what we have if loans data fails
      }

      let overdueInterestCount = 0;
      const currentMonthStart = startOfMonth(now);

      (activeLoansData as LoanWithMember[] || []).forEach(loan => {
        const unpaidMonths = getUnpaidMonths(loan);
        
        unpaidMonths.forEach(monthDate => {
          if (isBefore(monthDate, currentMonthStart)) {
            overdueInterestCount++;
          }
        });
      });

      const totalOverdueCount = repaymentOverdueCount + overdueInterestCount;
      const totalPendingCount = (repaymentPendingCount || 0);

      setData([
        { name: "Active", value: activeCount || 0, color: "#7d6b2e" },
        { name: "Paid", value: fullyPaidLoansCount || 0, color: "#22c55e" },
        { name: "Overdue", value: totalOverdueCount, color: "#dc2626" },
        { name: "Pending", value: totalPendingCount, color: "#3b82f6" },
      ])
      setIsLoading(false)
    }

    fetchData()
  }, [])

  const totalValue = data.reduce((acc, entry) => acc + entry.value, 0)

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-8 w-1/2 mb-6" />
        <Skeleton className="h-[300px] w-full" />
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">Loan Status Distribution</h2>
      {totalValue > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [value, "Count"]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[300px] items-center justify-center">
          <Empty>
            <EmptyTitle>No Data</EmptyTitle>
            <EmptyDescription>
              There is no loan status data to display at the moment.
            </EmptyDescription>
          </Empty>
        </div>
      )}
    </Card>
  )
}
