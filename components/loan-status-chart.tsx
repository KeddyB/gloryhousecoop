"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from "recharts"
import { createClient } from "@/utils/supabase/client"
import { isBefore, format, startOfMonth, addMonths } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"

interface InterestPayment {
  id: string;
  amount_paid: number;
  payment_for_month: string;
  payment_date: string;
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

  let calculationLimit = addMonths(currentMonthStart, 1);
  
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
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      
      // 1. Active: Total active users (Members)
      const { count: activeCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // 2. Closed: Members with completed payment (Loans closed/paid)
      const { count: closedCount } = await supabase
        .from('loans')
        .select('*', { count: 'exact', head: true })
        .or('state.eq.closed,state.eq.paid')

      // 3. Overdue & Pending Interest: From Loans and Interest Payments
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
      let pendingInterestCount = 0;
      const now = new Date();
      const currentMonthStart = startOfMonth(now);

      (activeLoansData as LoanWithMember[] || []).forEach(loan => {
        const unpaidMonths = getUnpaidMonths(loan); // This function already considers 'now' and 'currentMonthStart'
        
        unpaidMonths.forEach(monthDate => {
          if (isBefore(monthDate, currentMonthStart)) {
            overdueInterestCount++;
          } else {
            pendingInterestCount++;
          }
        });
      });

      setData([
        { name: "Active", value: activeCount || 0, color: "#7d6b2e" },
        { name: "Overdue Interest", value: overdueInterestCount, color: "#dc2626" },
        { name: "Pending Interest", value: pendingInterestCount, color: "#3b82f6" },
        { name: "Closed", value: closedCount || 0, color: "#7c3aed" },
      ])
      setIsLoading(false)
    }

    fetchData()
  }, [])

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
          <Tooltip formatter={(value: number) => [value, 'Count']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  )
}
