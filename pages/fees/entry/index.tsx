"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ElementType,
} from "react";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Loader2,
  Calendar,
  AlertCircle,
  CalendarDays,
  Banknote as BanknoteIcon,
  Wallet,
  Check,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  format,
  startOfMonth,
  addMonths,
  isBefore,
  startOfDay,
  isSameMonth,
  addDays,
} from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileHeader } from "@/components/mobile-header";
import { useRouter } from "next/router";
import { DatePicker } from "@/components/ui/date-picker";
import { useIsMobile } from "@/hooks/use-mobile";

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

export default function InterestFeeEntryPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<LoanWithMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLoan, setSelectedLoan] = useState<LoanWithMember | null>(null);

  // Stats
  const [todaysCollection, setTodaysCollection] = useState(0);
  const [thisMonthCollection, setThisMonthCollection] = useState(0);
  const [totalPending, setTotalPending] = useState(0);

  // Form states
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(
    new Date()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();

  const supabase = createClient();
  const { toast } = useToast();

  const getLoanStartDate = useCallback((loan: LoanWithMember) => {
    const disbursedDate =
      loan.disbursements?.[0]?.created_at || loan.created_at;
    return new Date(disbursedDate);
  }, []);

  const getLoanEndDate = useCallback(
    (loan: LoanWithMember) => {
      const startDate = getLoanStartDate(loan);
      return addMonths(startDate, loan.tenure);
    },
    [getLoanStartDate]
  );

  const getUnpaidMonths = useCallback(
    (loan: LoanWithMember) => {
      const startDue = getLoanStartDate(loan);
      const endDate = getLoanEndDate(loan);
      const now = new Date();
      const unpaidMonths: Date[] = [];

      // Per request, add a 30-day grace period before any month can be marked as unpaid.
      const gracePeriodEndDate = addDays(startDue, 30);
      if (isBefore(now, gracePeriodEndDate)) {
        return [];
      }

      const dueDay = startDue.getDate();

      let iterDate = startOfMonth(startDue);
      const currentMonthStart = startOfMonth(now);

      // We calculate payments up to the current month.
      let calculationLimit = addMonths(currentMonthStart, 1);

      // But not past the loan's end date.
      if (isBefore(endDate, calculationLimit)) {
        calculationLimit = endDate;
      }

      while (isBefore(iterDate, calculationLimit)) {
        const isPaid = loan.interest_payments.some((p) =>
          isSameMonth(new Date(p.payment_for_month), iterDate)
        );

        // The due date for the interest of month `iterDate` is on `dueDay` of the *next* month.
        // We construct the date this way to correctly handle days like the 31st for short months.
        const monthWithDueDay = new Date(
          iterDate.getFullYear(),
          iterDate.getMonth(),
          dueDay
        );
        const actualDueDate = addMonths(monthWithDueDay, 1);

        // A month is unpaid if it's not paid AND its due date is today or has passed.
        // !isBefore(now, actualDueDate) is equivalent to now >= actualDueDate
        if (!isPaid && !isBefore(now, actualDueDate)) {
          unpaidMonths.push(new Date(iterDate));
        }

        iterDate = addMonths(iterDate, 1);
      }

      return unpaidMonths;
    },
    [getLoanStartDate, getLoanEndDate]
  );

  const getPayableMonths = useCallback(
    (loan: LoanWithMember) => {
      const startDue = getLoanStartDate(loan);
      const endDate = getLoanEndDate(loan);
      const payableMonths: Date[] = [];

      let iterDate = startOfMonth(startDue);

      while (isBefore(iterDate, endDate)) {
        const isPaid = loan.interest_payments.some((p) =>
          isSameMonth(new Date(p.payment_for_month), iterDate)
        );

        if (!isPaid) {
          payableMonths.push(new Date(iterDate));
        }
        iterDate = addMonths(iterDate, 1);
      }

      return payableMonths;
    },
    [getLoanStartDate, getLoanEndDate]
  );

  const calculateStats = useCallback(
    (loanData: LoanWithMember[]) => {
      let todaySum = 0;
      let monthSum = 0; // Collections FOR this month
      let expectedThisMonth = 0;
      const today = new Date();
      const startOfToday = startOfDay(today);
      const startOfThisMonth = startOfMonth(today);

      loanData.forEach((loan) => {
        const monthlyInterest = (loan.loan_amount * loan.interest_rate) / 100;
        const loanStart = getLoanStartDate(loan);
        const loanEnd = getLoanEndDate(loan);

        // Calculate collections from payments
        loan.interest_payments.forEach((payment) => {
          const payDate = new Date(payment.payment_date);
          // Today's collection based on payment date
          if (startOfDay(payDate).getTime() === startOfToday.getTime()) {
            todaySum += payment.amount_paid;
          }
          // This month's collection based on the month the payment is FOR
          if (isSameMonth(new Date(payment.payment_for_month), today)) {
            monthSum += payment.amount_paid;
          }
        });

        // Calculate total expected FOR this month
        // A loan is active and expected to pay for this month if the month is
        // on or after its start month and before its end date.
        if (
          !isBefore(startOfThisMonth, startOfMonth(loanStart)) &&
          isBefore(startOfThisMonth, loanEnd)
        ) {
          expectedThisMonth += monthlyInterest;
        }
      });

      // Pending is what's expected for this month minus what's been collected for this month.
      const pendingSum = Math.max(0, expectedThisMonth - monthSum);

      setTodaysCollection(todaySum);
      setThisMonthCollection(monthSum);
      setTotalPending(pendingSum);
    },
    [getLoanStartDate, getLoanEndDate]
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("loans")
        .select(
          `
          id,
          loan_amount,
          interest_rate,
          tenure,
          created_at,
          state,
          member:members (
            id,
            member_id,
            name,
            full_name,
            phone,
            avatar_url
          ),
          interest_payments (
            id,
            amount_paid,
            payment_for_month,
            payment_date
          ),
          disbursements (
            created_at
          )
        `
        )
        .or("state.eq.active,state.eq.disbursed")
        .order("created_at", { ascending: false });

      if (error) throw error;

      type RawLoan = Omit<LoanWithMember, "member"> & {
        member: LoanWithMember["member"] | LoanWithMember["member"][] | null;
      };

      const transformedData = ((data as RawLoan[]) || []).map((loan) => ({
        ...loan,
        member: Array.isArray(loan.member) ? loan.member[0] : loan.member,
      }));

      setLoans(transformedData as LoanWithMember[]);
      calculateStats(transformedData as LoanWithMember[]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load interest fee data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [calculateStats, supabase, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitPayment = async () => {
    if (!selectedLoan || selectedMonths.length === 0 || !paymentDate) {
      toast({
        title: "Error",
        description: "Please select a payment date.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const operatorName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email ||
        "System";
      const monthlyInterest =
        (selectedLoan.loan_amount * selectedLoan.interest_rate) / 100;

      const payments = selectedMonths.map((month) => ({
        loan_id: selectedLoan.id,
        amount_paid: monthlyInterest,
        payment_for_month: month,
        payment_method: paymentMethod,
        payment_date: paymentDate.toISOString(),
        created_by: user?.id,
        created_by_name: operatorName,
      }));

      const { error } = await supabase
        .from("interest_payments")
        .insert(payments);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Interest payment(s) recorded successfully",
      });

      setSelectedMonths([]);
      fetchData();
      setSelectedLoan(null);
    } catch (error: unknown) {
      let message = "An unexpected error occurred.";
      if (error instanceof Error) {
        message = error.message;
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLoans = useMemo(() => {
    if (isMobile && selectedLoan) {
      return [selectedLoan];
    }
    const query = searchQuery.toLowerCase();
    return loans.filter(
      (l) =>
        (l.member.full_name || l.member.name || "")
          .toLowerCase()
          .includes(query) ||
        (l.member.member_id || "").toLowerCase().includes(query)
    );
  }, [loans, searchQuery, selectedLoan, isMobile]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <MobileHeader title="Interest Fee Entry" onBack={() => router.back()} />
      <div className="flex-1 overflow-auto p-8">
        <div className="space-y-8 pt-[4.5rem] md:pt-0">
          {/* Header */}
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold tracking-tight">
              Interest Collection Entry
            </h1>
            <p className="text-sm text-muted-foreground">
              Record interest monthly fee payments from members
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {isLoading ? (
              <>
                <Skeleton className="h-[120px] rounded-xl" />
                <Skeleton className="h-[120px] rounded-xl" />
                <Skeleton className="h-[120px] rounded-xl" />
              </>
            ) : (
              <>
                <StatCard
                  label="Today's Collection"
                  amount={todaysCollection}
                  icon={BanknoteIcon}
                  color="text-blue-600"
                  iconBg="bg-blue-50"
                  borderColor="border-grey"
                />
                <StatCard
                  label="This month"
                  amount={thisMonthCollection}
                  icon={Calendar}
                  color="text-green-600"
                  iconBg="bg-green-50"
                  borderColor="border-grey"
                />
                <StatCard
                  label="Pending Payment"
                  amount={totalPending}
                  icon={AlertCircle}
                  color="text-orange-600"
                  iconBg="bg-orange-50"
                  borderColor="border-grey"
                />
              </>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Member List Section - Left 7 Cols */}
            <Card className="w-full lg:w-7/12 h-fit border-border shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Member List</h2>
                  {isMobile && selectedLoan && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLoan(null)}
                    >
                      Clear Selection
                    </Button>
                  )}
                </div>
                {(!isMobile || !selectedLoan) && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, member ID, phone or email..."
                      className="pl-9 bg-muted/50 border-none h-11"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-3">
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card"
                        >
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : filteredLoans.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-10">
                      No members found.
                    </p>
                  ) : (
                    filteredLoans.map((loan) => {
                      const unpaidMonths = getUnpaidMonths(loan);
                      const isSelected = selectedLoan?.id === loan.id;

                      const today = new Date();
                      const loanStart = getLoanStartDate(loan);
                      const loanEnd = getLoanEndDate(loan);

                      // Check if a payment has been made for the current month.
                      const isPaidForCurrentMonth = loan.interest_payments.some(
                        (p) =>
                          isSameMonth(new Date(p.payment_for_month), today)
                      );

                      // Check if the loan is active in the current month.
                      const isActiveThisMonth =
                        !isBefore(
                          startOfMonth(today),
                          startOfMonth(loanStart)
                        ) && isBefore(startOfMonth(today), loanEnd);

                      return (
                        <div
                          key={loan.id}
                          onClick={() => {
                            setSelectedLoan(loan);
                            setSelectedMonths([]);
                          }}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all bg-card hover:bg-muted/50",
                            isSelected
                              ? "border-black ring-1 ring-black"
                              : "border-border"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10 bg-muted">
                              <AvatarFallback>
                                {loan.member.name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm">
                                {loan.member.full_name || loan.member.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {loan.member.member_id} • {loan.member.phone}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <Badge
                              variant="default"
                              className="bg-black text-white hover:bg-black/90 rounded-full text-[10px] font-medium px-3 py-0.5"
                            >
                              active
                            </Badge>
                            {unpaidMonths.length > 0 ? (
                              <p className="text-[11px] font-medium text-red-500">
                                {unpaidMonths.length} unpaid month(s)
                              </p>
                            ) : isActiveThisMonth && !isPaidForCurrentMonth ? (
                              <p className="text-[11px] font-medium text-orange-500">
                                Pending
                              </p>
                            ) : (
                              <p className="text-[11px] font-medium text-green-500">
                                Up to date
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Interest Details Section - Right 5 Cols */}
            <Card className="w-full lg:w-5/12 border-border shadow-sm bg-card h-fit rounded-xl">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-6">Interest Details</h2>
                {selectedLoan ? (
                  <div className="space-y-6">
                    {/* Selected Member Header */}
                    <div className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border">
                      <Avatar className="h-12 w-12 bg-muted">
                        <AvatarFallback className="text-lg font-bold text-muted-foreground">
                          {selectedLoan.member.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-base font-bold">
                          {selectedLoan.member.full_name ||
                            selectedLoan.member.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {selectedLoan.member.member_id} •{" "}
                          {selectedLoan.member.phone}
                        </p>
                      </div>
                    </div>

                    {/* Select Month */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium">
                        Select month
                      </label>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {getPayableMonths(selectedLoan).length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">
                            No unpaid interest fees due.
                          </p>
                        ) : (
                          getPayableMonths(selectedLoan)
                            .slice(0, 4)
                            .map((date) => {
                              const val = format(date, "yyyy-MM-dd");
                              const isChecked = selectedMonths.includes(val);
                              return (
                                <div
                                  key={val}
                                  onClick={() => {
                                    if (isChecked) {
                                      setSelectedMonths(
                                        selectedMonths.filter((m) => m !== val)
                                      );
                                    } else {
                                      setSelectedMonths([
                                        ...selectedMonths,
                                        val,
                                      ]);
                                    }
                                  }}
                                  className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all h-12",
                                    isChecked
                                      ? "border-black ring-1 ring-black bg-background"
                                      : "border-border bg-background hover:border-muted-foreground/30"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "h-5 w-5 rounded-md border flex items-center justify-center transition-colors",
                                      isChecked
                                        ? "bg-black border-black text-white"
                                        : "border-input bg-background"
                                    )}
                                  >
                                    {isChecked && (
                                      <Check className="h-3.5 w-3.5" />
                                    )}
                                  </div>
                                  <span className="text-sm font-medium">
                                    {format(date, "MMMM yyyy")}
                                  </span>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>

                    {/* Interest Fee Amount (Per Month) */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Interest Fee Amount (Per Month)
                      </label>
                      <div className="h-12 bg-muted/50 border border-border rounded-lg flex items-center px-4 text-sm font-semibold w-full">
                        ₦
                        {(
                          (selectedLoan.loan_amount *
                            selectedLoan.interest_rate) /
                          100
                        ).toLocaleString()}
                      </div>
                    </div>

                    {/* Payment Date */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Payment Date
                      </label>
                      <DatePicker
                        date={paymentDate}
                        setDate={setPaymentDate}
                        className="h-12 bg-background border-input rounded-lg w-full"
                      />
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Payment Method
                      </label>
                      <Select
                        value={paymentMethod}
                        onValueChange={setPaymentMethod}
                      >
                        <SelectTrigger className="h-12 bg-muted/50 border-border rounded-lg w-full">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Bank Transfer">
                            Bank Transfer
                          </SelectItem>
                          <SelectItem value="POS">POS</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Total Amount Card */}
                    <div className="p-4 rounded-lg border border-border bg-background space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold">
                          Total Amount:
                        </span>
                        <span className="text-lg font-bold">
                          ₦
                          {selectedMonths.length > 0
                            ? (
                                selectedMonths.length *
                                ((selectedLoan.loan_amount *
                                  selectedLoan.interest_rate) /
                                  100)
                              ).toLocaleString()
                            : "0"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedMonths.length} month(s) × ₦
                        {(
                          (selectedLoan.loan_amount *
                            selectedLoan.interest_rate) /
                          100
                        ).toLocaleString()}
                      </p>
                    </div>

                    <Button
                      className="w-full h-12 bg-black hover:bg-black/90 text-white font-semibold rounded-lg mt-2"
                      onClick={handleSubmitPayment}
                      disabled={selectedMonths.length === 0 || isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Wallet className="h-4 w-4 mr-2" />
                      )}
                      Record Interest Payment
                    </Button>
                  </div>
                ) : isLoading ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                          <Skeleton
                            key={i}
                            className="h-12 w-full rounded-lg"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </div>

                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </div>

                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </div>

                    <Skeleton className="h-28 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="relative">
                      <div className="h-16 w-12 border-2 border-gray-300 rounded-sm flex items-center justify-center bg-white transform rotate-[-5deg]"></div>
                      <div className="h-16 w-12 border-2 border-gray-400 rounded-sm flex items-center justify-center bg-white absolute top-0 left-0 transform rotate-[5deg]">
                        <span className="text-xl font-bold text-gray-400">
                          $
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1 mt-4">
                      <h3 className="text-base font-bold">Select a Member</h3>
                      <p className="text-sm text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                        Choose a member from the list to record their fee
                        payment
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  amount,
  icon: Icon,
  color,
  iconBg,
  borderColor,
}: {
  label: string;
  amount: number;
  icon: ElementType;
  color: string;
  iconBg: string;
  borderColor: string;
}) {
  return (
    <Card className={cn("shadow-sm bg-card rounded-xl border", borderColor)}>
      <CardContent className="p-6 flex items-center justify-start gap-4">
        <div
          className={cn(
            "p-3 rounded-full flex items-center justify-center h-10 w-10",
            iconBg
          )}
        >
          <Icon className={cn("h-5 w-5", color)} />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
            {label}
          </p>
          <h3 className="text-2xl font-bold">₦{amount.toLocaleString()}</h3>
        </div>
      </CardContent>
    </Card>
  );
}
