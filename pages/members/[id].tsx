import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Edit,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  FileText,
  AlertCircle,
  Banknote,
  Wallet,
  Activity,
  DollarSign,
  Briefcase,
  Plus,
  Search,
  Download,
  Eye,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { EditProfileDialog } from "@/components/edit-profile-dialog";
import { Member } from "./types";
import {
  format,
  startOfMonth,
  addMonths,
  isBefore,
  isSameMonth,
} from "date-fns";

export default function MemberProfile() {
  const router = useRouter();
  const { id } = router.query;
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const supabase = createClient();

  async function fetchMember() {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("member_id", id)
        .single();

      if (error) {
        console.error("Error fetching member:", error);
      } else {
        setMember(data);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  }

  const [totalInterestPaid, setTotalInterestPaid] = useState<number>(0);
  const [pendingInterest, setPendingInterest] = useState<number>(0);
  const [missedRepayment, setMissedRepayment] = useState<number>(0);
  const [activeLoan, setActiveLoan] = useState<number>(0);
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  async function fetchMemberData() {
    if (!id) return;

    try {
      // Fetch Active Loans (plural)
      const { data: loansData, error: loansError } = await supabase
        .from("loans")
        .select("*, disbursements(created_at), interest_payments(payment_for_month, amount_paid), repayments(amount_paid)")
        .eq("member_id", id)
        .or("state.eq.active,state.eq.disbursed");

      if (loansError) {
         console.error("Error fetching loans data:", loansError);
      } else if (loansData) {
        setActiveLoans(loansData);
        // Calculate totals for Active Loans
        const totalActiveLoanAmount = loansData.reduce((sum, loan) => sum + (loan.loan_amount ?? loan.amount ?? 0), 0);
        
        // Calculate total repayments made towards active loans
        const totalRepaid = loansData.reduce((sum, loan) => {
            const loanRepaid = loan.repayments ? loan.repayments.reduce((rSum: number, r: any) => rSum + (r.amount_paid ?? 0), 0) : 0;
            return sum + loanRepaid;
        }, 0);

        const balance = totalActiveLoanAmount - totalRepaid;
        
        setActiveLoan(totalActiveLoanAmount);
        setCurrentBalance(balance > 0 ? balance : 0);

        // Calculate Pending Interest and Missed Installments for ALL active loans
        let totalPending = 0;
        let totalMissedRepayment = 0;

        loansData.forEach(loan => {
            const disbursedDate = loan.disbursements?.[0]?.created_at || loan.created_at;
            
            if (disbursedDate) {
                const loanAmount = loan.loan_amount ?? loan.amount ?? 0;
                const startDue = addMonths(new Date(disbursedDate), 1);
                const tenure = loan.tenure;
                const loanEndDate = addMonths(startDue, tenure);
                const monthlyInterest = (loanAmount * loan.interest_rate) / 100;
                const monthlyPrincipal = tenure > 0 ? loanAmount / tenure : 0;
                
                // Interest Calculation
                const now = new Date();
                const currentMonthStart = startOfMonth(now);
                
                let limitDate = addMonths(currentMonthStart, 1);
                if (isBefore(loanEndDate, limitDate)) {
                    limitDate = loanEndDate;
                }

                let iterDate = startOfMonth(startDue);
                while (isBefore(iterDate, limitDate)) {
                     const isPaid = loan.interest_payments?.some((p: any) => 
                         isSameMonth(new Date(p.payment_for_month), iterDate)
                     );
                     
                     if (!isPaid) {
                         totalPending += monthlyInterest;
                     }
                     iterDate = addMonths(iterDate, 1);
                }

                // Principal Installment Calculation
                // Check how many installments are due based on time
                let dueInstallments = 0;
                let d = new Date(startDue);
                let monthsChecked = 0;
                
                while (isBefore(d, now) && monthsChecked < tenure) {
                     dueInstallments++;
                     d = addMonths(d, 1);
                     monthsChecked++;
                }
                
                const expectedRepaid = dueInstallments * monthlyPrincipal;
                const loanRepaid = loan.repayments ? loan.repayments.reduce((rSum: number, r: any) => rSum + (r.amount_paid ?? 0), 0) : 0;

                if (loanRepaid < expectedRepaid) {
                    // Use a small tolerance for floating point comparison
                    if (expectedRepaid - loanRepaid > 1) {
                         totalMissedRepayment += (expectedRepaid - loanRepaid);
                    }
                }
            }
        });
        setPendingInterest(totalPending);
        setMissedRepayment(totalMissedRepayment);
      }

      // Fetch All Loans with all related transactions for Recent Activity and Total Interest
      const { data: allLoansData, error: allLoansError } = await supabase
        .from("loans")
        .select(`
            id,
            interest_payments(id, amount_paid, payment_date, created_at),
            repayments(id, amount_paid, paid_at, created_at),
            disbursements(id, disbursement_amount, created_at)
        `)
        .eq("member_id", id);

      if (allLoansError) {
         console.error("Error fetching all loans data:", allLoansError);
      } else if (allLoansData) {
         // 1. Calculate Total Interest Paid
         const totalPaid = allLoansData.reduce((sum, loan: any) => {
             const loanTotal = loan.interest_payments ? loan.interest_payments.reduce((lSum: number, p: any) => lSum + p.amount_paid, 0) : 0;
             return sum + loanTotal;
         }, 0);
         setTotalInterestPaid(totalPaid);

         // 2. Build Recent Activity
         let activities: any[] = [];
         
         allLoansData.forEach((loan: any) => {
             // Interest
             if (loan.interest_payments) {
                 loan.interest_payments.forEach((p: any) => {
                     activities.push({
                         id: `int-${p.id}`,
                         title: "Interest Payment",
                         date: p.payment_date || p.created_at,
                         amount: p.amount_paid,
                         type: "success" // Money IN
                     });
                 });
             }
             // Repayments
             if (loan.repayments) {
                 loan.repayments.forEach((r: any) => {
                     activities.push({
                         id: `rep-${r.id}`,
                         title: "Loan Repayment",
                         date: r.paid_at || r.created_at,
                         amount: r.amount_paid,
                         type: "success" // Money IN
                     });
                 });
             }
             // Disbursements
             if (loan.disbursements) {
                 loan.disbursements.forEach((d: any) => {
                     activities.push({
                         id: `dis-${d.id}`,
                         title: "Loan Disbursement",
                         date: d.created_at,
                         amount: d.disbursement_amount,
                         type: "danger" // Money OUT
                     });
                 });
             }
         });
         
         // Sort by date desc
         activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
         
         // Take top 4
         setRecentActivity(activities.slice(0, 4));
      }

    } catch (error) {
      console.error("Unexpected error:", error);
    }
  }

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchMember(), fetchMemberData()]);
      setLoading(false);
    };
    if (id) {
      loadData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <div className="p-8 space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
              <Skeleton className="h-10 w-32" />
            </div>

            {/* Profile Card Skeleton */}
            <Card className="border-none shadow-sm bg-blue-50/50">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <Skeleton className="h-24 w-24 rounded-full border-4 border-white" />
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-48" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {Array(5)
                        .fill(0)
                        .map((_, i) => (
                          <Skeleton key={i} className="h-4 w-32" />
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6 flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>

            {/* Tabs Skeleton */}
            <Skeleton className="w-full h-12 rounded-full" />

            {/* Content Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center bg-gray-50/50">
          <p className="text-muted-foreground">Member not found</p>
        </div>
      </div>
    );
  }

  const fullName = member.name.trim() || "Unknown Member";
  const initials = member.name
    ? member.name.substring(0, 2).toUpperCase()
    : "??";

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Member Profile
                </h1>
                <p className="text-sm text-muted-foreground">
                  Complete member information and activity history
                </p>
              </div>
            </div>
            <Button
              className="bg-black text-white hover:bg-black/90"
              onClick={() => setEditDialogOpen(true)}
            >
              <Edit className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          </div>

          {/* Profile Card */}
          <Card className="border-none shadow-sm bg-blue-50/50">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <Avatar className="h-24 w-24 border-4 border-white shadow-sm">
                  <AvatarFallback className="text-2xl bg-blue-600 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">{fullName}</h2>
                    <Badge
                      className={`px-3 py-0.5 rounded-full text-xs font-normal ${
                        member.status === "active"
                          ? "bg-black hover:bg-black text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {member.status || "Unknown"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-2 gap-x-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>ID: {member.member_id || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{member.phone || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{member.email || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Joined{" "}
                        {member.created_at
                          ? new Date(member.created_at).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 md:col-span-4">
                      <MapPin className="h-4 w-4" />
                      <span>{member.location || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total Interest Paid
                  </p>
                  <p className="text-xl font-bold">N{totalInterestPaid}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Pending Interest
                  </p>
                  <p className="text-xl font-bold">N{pendingInterest}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Banknote className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Loan</p>
                  <p className="text-xl font-bold">N{activeLoan}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Current Balance
                  </p>
                  <p className="text-xl font-bold">N{currentBalance}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full h-auto bg-gray-100 rounded-full p-4 mb-8 flex items-center justify-between">
              {[
                { value: "overview", icon: Activity, label: "Overview" },
                { value: "personal", icon: User, label: "Personal" },
                { value: "interest", icon: DollarSign, label: "Interest Fees" },
                { value: "loans", icon: Briefcase, label: "Loans" },
                {
                  value: "transactions",
                  icon: Activity,
                  label: "Transactions",
                },
                { value: "documents", icon: FileText, label: "Documents" },
                { value: "notes", icon: FileText, label: "Notes" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-full px-3 py-1 data-[state=active]:!bg-white data-[state=active]:text-black data-[state=active]:shadow-sm text-muted-foreground text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5 h-11 mx-8 hover:bg-gray-50 data-[state=active]:hover:bg-white shadow-none border-0 ring-0"
                >
                  <tab.icon className="h-3.5 w-3.5" /> {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Activity className="h-4 w-4" /> Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {recentActivity.length > 0 ? (
                        recentActivity.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-1.5 h-2 w-2 rounded-full ${
                                  item.type === "success"
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                }`}
                              />
                              <div>
                                <p className="font-medium text-sm">
                                  {item.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(item.date), "dd-MM-yyyy")}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`text-sm font-medium ${
                                item.type === "success"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {item.type === "success" ? "+" : "-"}N{item.amount.toLocaleString()}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No recent activity found.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Active Loan Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Activity className="h-4 w-4" /> Active Loan Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {activeLoans.length > 0 ? (
                      activeLoans.map((loan, i) => {
                         const loanAmount = loan.loan_amount ?? loan.amount ?? 0;
                         const loanRepaid = loan.repayments ? loan.repayments.reduce((acc: number, curr: any) => acc + (curr.amount_paid ?? 0), 0) : 0;
                         const remaining = Math.max(0, loanAmount - loanRepaid);
                         const progress = loanAmount > 0 ? (loanRepaid / loanAmount) * 100 : 0;
                         
                         const disbursedDate = loan.disbursements?.[0]?.created_at || loan.created_at;
                         const startDue = disbursedDate ? addMonths(new Date(disbursedDate), 1) : new Date();
                         const tenure = loan.tenure || 0;
                         
                         let nextDueDate = new Date(startDue);
                         const now = new Date();
                         let monthsCount = 0;
                         
                         while(isBefore(nextDueDate, now) && monthsCount < tenure) {
                            nextDueDate = addMonths(nextDueDate, 1);
                            monthsCount++;
                         }
                         
                         const monthlyPrincipal = tenure > 0 ? loanAmount / tenure : 0;

                         return (
                            <div key={loan.id} className={i > 0 ? "pt-6 border-t" : ""}>
                                <div className="space-y-2 mb-6">
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Loan #{loan.id.substring(0, 6)}...</span>
                                    <span>Tenure: {tenure} months</span>
                                  </div>
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Paid: N{loanRepaid.toLocaleString()}</span>
                                    <span>Remaining: N{remaining.toLocaleString()}</span>
                                  </div>
                                  <Progress value={progress} className="h-2 bg-gray-100" />
                                </div>

                                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">
                                      Loan Disbursement Date
                                    </p>
                                    <p className="font-medium text-sm">{disbursedDate ? format(new Date(disbursedDate), "dd-MM-yyyy") : "N/A"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">
                                      Next Due Date
                                    </p>
                                    <p className="font-medium text-sm">{format(nextDueDate, "dd-MM-yyyy")}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">
                                      Monthly Payment (Principal)
                                    </p>
                                    <p className="font-medium text-sm">N{Math.ceil(monthlyPrincipal).toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">
                                      Interest Rate
                                    </p>
                                    <p className="font-medium text-sm">{loan.interest_rate}%</p>
                                  </div>
                                </div>
                            </div>
                         );
                      })
                    ) : (
                        <div className="text-center text-sm text-muted-foreground py-4">
                            No active loans found.
                        </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="personal" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" /> Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 md:col-span-1">
                        <p className="text-xs text-muted-foreground">
                          Full Name
                        </p>
                        <p className="text-sm font-medium">{fullName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Member ID
                        </p>
                        <p className="text-sm font-medium">
                          {member.member_id || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Phone Number
                        </p>
                        <p className="text-sm font-medium">
                          {member.phone || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Email
                        </p>
                        <p className="text-sm font-medium truncate" title={member.email || ""}>
                          {member.email || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Join Date
                        </p>
                        <p className="text-sm font-medium">
                          {member.created_at
                            ? new Date(member.created_at).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="text-sm font-medium capitalize">
                          {member.status || "Active"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">
                          Address
                        </p>
                        <p className="text-sm font-medium">
                          {member.location || "N/A"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" /> Nominee Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">
                          Nominee Name
                        </p>
                        <p className="text-sm font-medium">{member.nominee_name || "N/A"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">
                          Phone Number
                        </p>
                        <p className="text-sm font-medium">{member.nominee_phone || "N/A"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {activeLoans.some((l: any) => l.third_party_name) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="h-4 w-4" /> Third Party Borrower Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {activeLoans
                        .filter((l: any) => l.third_party_name)
                        .map((loan: any, index: number) => (
                          <div key={loan.id} className={index > 0 ? "pt-4 border-t" : ""}>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Full Name
                                </p>
                                <p className="text-sm font-medium">{loan.third_party_name}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Phone Number
                                </p>
                                <p className="text-sm font-medium">
                                  {loan.third_party_number || "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" /> Bank Account Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Account Number
                        </p>
                        <p className="text-sm font-medium">{member.account_number || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Bank Name
                        </p>
                        <p className="text-sm font-medium">{member.bank_name || "N/A"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="interest" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Interest Fee Payment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        {
                          month: "April, 2024",
                          amount: "N30,000",
                          date: "Not Paid",
                          method: "-",
                          status: "overdue",
                        },
                        {
                          month: "March, 2024",
                          amount: "N50,000",
                          date: "17-03-2025",
                          method: "Cash",
                          status: "active",
                        },
                        {
                          month: "February, 2024",
                          amount: "N50,000",
                          date: "16-02-2025",
                          method: "Bank Transfer",
                          status: "active",
                        },
                        {
                          month: "January, 2024",
                          amount: "N50,000",
                          date: "15-1-2024",
                          method: "Cash",
                          status: "active",
                        },
                        {
                          month: "December, 2023",
                          amount: "N50,000",
                          date: "17-12-2023",
                          method: "Mobile Transfer",
                          status: "active",
                        },
                      ].map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.month}</TableCell>
                          <TableCell>{item.amount}</TableCell>
                          <TableCell>{item.date}</TableCell>
                          <TableCell>{item.method}</TableCell>
                          <TableCell>
                            <Badge
                              className={`rounded-full px-3 font-normal capitalize ${
                                item.status === "overdue"
                                  ? "bg-red-600 hover:bg-red-700"
                                  : "bg-black hover:bg-black"
                              }`}
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="loans" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Loan History</CardTitle>
                  <Button variant="outline" size="sm" className="h-8">
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> New Loan
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Loan Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Disbursed</TableHead>
                        <TableHead>Tenure</TableHead>
                        <TableHead>Interest</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Remaining</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Active</TableCell>
                        <TableCell>N500,000</TableCell>
                        <TableCell>17-12-2023</TableCell>
                        <TableCell>12 months</TableCell>
                        <TableCell>10%</TableCell>
                        <TableCell>100,000</TableCell>
                        <TableCell>400,000</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Inactive</TableCell>
                        <TableCell>N500,000</TableCell>
                        <TableCell>05-03-2021</TableCell>
                        <TableCell>18 months</TableCell>
                        <TableCell>10%</TableCell>
                        <TableCell>Paid</TableCell>
                        <TableCell>-</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base mb-4">
                    Transaction History
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search transactions..."
                        className="pl-9 bg-muted/50 border-none"
                      />
                    </div>
                    <Select defaultValue="all">
                      <SelectTrigger className="w-[180px] bg-muted/50 border-none">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="fee">Fee Payment</SelectItem>
                        <SelectItem value="loan">Loan Repayment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        {
                          type: "Fee Payment",
                          desc: "Monthly fee for March 2024",
                          amount: "N30,000",
                          balance: "N300,000",
                        },
                        {
                          type: "Loan Repayment",
                          desc: "Quarterly Installment",
                          amount: "N200,000",
                          balance: "N200,000",
                        },
                        {
                          type: "Fee Payment",
                          desc: "Monthly fee for February 2024",
                          amount: "N50,000",
                          balance: "N500,000",
                        },
                        {
                          type: "Fee Payment",
                          desc: "Monthly fee for January 2024",
                          amount: "N50,000",
                          balance: "N500,000",
                        },
                      ].map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {item.type}
                          </TableCell>
                          <TableCell>{item.desc}</TableCell>
                          <TableCell>{item.amount}</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>{item.balance}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">Documents</h2>
                <Button variant="outline" size="sm" className="h-9">
                  <Plus className="h-4 w-4 mr-2" /> Upload Document
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">Loan Agreement</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF • 2.5 MB
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Uploaded: 2023-01-15
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">Collateral Document</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF • 3.1 MB
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Uploaded: 2023-01-20
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">Member Notes</h2>
                <Button variant="outline" size="sm" className="h-9">
                  <Plus className="h-4 w-4 mr-2" /> Add Notes
                </Button>
              </div>
              <div className="space-y-4">
                {[
                  {
                    date: "2024-01-15",
                    user: "Admin User 1",
                    note: "Member requested loan extension. Approved for 2 months.",
                  },
                  {
                    date: "2024-01-15",
                    user: "Admin User 2",
                    note: "Payment received through mobile banking. Verified.",
                  },
                  {
                    date: "2024-01-15",
                    user: "Admin User 1",
                    note: "Interest Fees for last month overdue for 5days..Send Notice for collection",
                  },
                ].map((note, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">
                          {note.date}
                        </div>
                        <div className="font-medium text-sm">{note.user}</div>
                        <div className="text-sm text-muted-foreground">
                          {note.note}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer Warning */}
          {(pendingInterest > 0 || missedRepayment > 100) && (
          <div className="flex items-center gap-2 p-4 bg-orange-50 border border-orange-100 rounded-lg text-orange-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>
              {pendingInterest > 0 && missedRepayment > 100 
                  ? `This member has pending interest fees (₦${pendingInterest.toLocaleString()}) and missed loan installments (₦${missedRepayment.toLocaleString()}). Please follow up.`
                  : pendingInterest > 0 
                      ? `This member has pending interest fee payment(s) of ₦${pendingInterest.toLocaleString()}. Please follow up.`
                      : `This member has missed loan installment(s) of ₦${missedRepayment.toLocaleString()}. Please follow up.`
              }
            </span>
          </div>
          )}
        </div>

        {/* Edit Profile Dialog */}
        <EditProfileDialog
          member={member}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={fetchMember}
        />
      </div>
    </div>
  );
}
