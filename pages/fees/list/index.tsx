"use client";

import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Loader2, CheckCircle2, Clock, AlertCircle, Banknote, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { format, startOfMonth, addMonths, isBefore, startOfDay, isSameMonth, isAfter, endOfMonth, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface FeeRecord {
  id: string;
  member_name: string;
  member_id: string;
  member_avatar?: string;
  month: Date;
  amount: number;
  pay_date?: string;
  method?: string;
  status: "active" | "pending" | "overdue";
  loan_id: string;
  created_at?: string;
}

export default function FeeListPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [stats, setStats] = useState({
    paid: 0,
    pending: 0,
    overdue: 0,
    totalCollected: 0,
  });

  const supabase = createClient();

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch all interest payments (Paid records)
      const paymentsResult = await supabase
        .from("interest_payments")
        .select(`
            id,
            amount_paid,
            payment_for_month,
            payment_date,
            payment_method,
            created_at,
            loan:loans (
                id,
                loan_amount,
                interest_rate,
                member:members (
                    id,
                    member_id,
                    name,
                    full_name,
                    phone,
                    avatar_url
                )
            )
        `)
        .order('created_at', { ascending: false });

      if (paymentsResult.error) throw paymentsResult.error;
      setPayments(paymentsResult.data || []);

      // 2. Fetch active loans to calculate Pending/Overdue
      const loansResult = await supabase
        .from("loans")
        .select(`
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
          disbursements (
            created_at
          )
        `)
        .or('state.eq.active,state.eq.disbursed');

       // We don't throw on loans error, just log it, so at least payments show up
      if (loansResult.error) {
          console.error("Error fetching loans:", loansResult.error);
      } else {
          setActiveLoans(loansResult.data || []);
      }

    } catch (error: any) {
      console.error("Error fetching data:", error);
      setError(error.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const feeRecords = useMemo(() => {
    const records: FeeRecord[] = [];
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    
    // Set to track which months are paid for which loan
    const paidMonths = new Set<string>(); // Format: loanId-YYYY-MM

    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let collectedSum = 0;

    // Process Payments (Active)
    payments.forEach(p => {
        if (!p.loan || !p.loan.member) return;

        const record: FeeRecord = {
            id: p.id,
            member_name: p.loan.member.full_name || p.loan.member.name || "Unknown",
            member_id: p.loan.member.member_id || "N/A",
            member_avatar: p.loan.member.avatar_url,
            month: new Date(p.payment_for_month),
            amount: p.amount_paid,
            pay_date: p.payment_date,
            method: p.payment_method,
            status: "active",
            loan_id: p.loan.id,
            created_at: p.created_at
        };
        
        records.push(record);
        paidCount++;
        collectedSum += p.amount_paid;

        // Mark this month as paid
        const key = `${p.loan.id}-${format(new Date(p.payment_for_month), "yyyy-MM")}`;
        paidMonths.add(key);
    });

    // Process Active Loans (Pending/Overdue)
    activeLoans.forEach((loan) => {
      if (!loan.member) return;

      const disbursedDate = loan.disbursements?.[0]?.created_at || loan.created_at;
      const startDue = addMonths(new Date(disbursedDate), 1);
      const loanEndDate = addMonths(startDue, loan.tenure);
      const monthlyInterest = (loan.loan_amount * loan.interest_rate) / 100;
      
      let iterDate = startOfMonth(startDue);
      
      // Calculate up to next month or loan end
      const calculationLimit = isBefore(loanEndDate, addMonths(currentMonthStart, 1)) 
          ? loanEndDate 
          : addMonths(currentMonthStart, 1);

      while (isBefore(iterDate, calculationLimit)) {
          const iterDateKey = format(iterDate, "yyyy-MM");
          const uniqueKey = `${loan.id}-${iterDateKey}`;

          // If not paid, add as pending or overdue
          if (!paidMonths.has(uniqueKey)) {
              let status: "pending" | "overdue" = "pending";
              if (isBefore(iterDate, currentMonthStart)) {
                  status = "overdue";
                  overdueCount++;
              } else {
                  pendingCount++;
              }

              records.push({
                  id: uniqueKey, // Virtual ID
                  member_name: loan.member.full_name || loan.member.name || "Unknown",
                  member_id: loan.member.member_id || "N/A",
                  member_avatar: loan.member.avatar_url,
                  month: new Date(iterDate),
                  amount: monthlyInterest,
                  status: status,
                  loan_id: loan.id
              });
          }

          iterDate = addMonths(iterDate, 1);
      }
    });

    setStats({
        paid: paidCount,
        pending: pendingCount,
        overdue: overdueCount,
        totalCollected: collectedSum
    });

    // Sort by date descending
    // Prioritize created_at if available (for paid records), otherwise use month (for pending/overdue)
    return records.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : a.month.getTime();
        const timeB = b.created_at ? new Date(b.created_at).getTime() : b.month.getTime();
        return timeB - timeA;
    });
  }, [payments, activeLoans]);

  const filteredRecords = useMemo(() => {
    return feeRecords.filter(record => {
      const matchesSearch = 
        record.member_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.member_id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      
      const matchesMonth = monthFilter === "all" ? true : 
          format(record.month, "MMMM") === monthFilter;

      return matchesSearch && matchesStatus && matchesMonth;
    });
  }, [feeRecords, searchQuery, statusFilter, monthFilter]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, monthFilter]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  const uniqueMonths = useMemo(() => {
      const months = new Set(feeRecords.map(r => format(r.month, "MMMM")));
      return Array.from(months);
  }, [feeRecords]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Interest Fee Management</h1>
            <p className="text-sm text-muted-foreground">
              Track and manage monthly interest fee collections
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
                <h3 className="font-semibold">Error Loading Data</h3>
                <p>{error}</p>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="shadow-sm">
                <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase font-medium">Paid</p>
                        <h3 className="text-2xl font-bold">{stats.paid}</h3>
                    </div>
                </CardContent>
            </Card>
            <Card className="shadow-sm">
                <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                        <Clock className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase font-medium">Pending</p>
                        <h3 className="text-2xl font-bold">{stats.pending}</h3>
                    </div>
                </CardContent>
            </Card>
            <Card className="shadow-sm">
                <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase font-medium">Overdue</p>
                        <h3 className="text-2xl font-bold">{stats.overdue}</h3>
                    </div>
                </CardContent>
            </Card>
            <Card className="shadow-sm">
                <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Banknote className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase font-medium">Total Collected</p>
                        <h3 className="text-2xl font-bold">₦{stats.totalCollected.toLocaleString()}</h3>
                    </div>
                </CardContent>
            </Card>
          </div>

          {/* Table Section */}
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                   <h2 className="text-lg font-semibold">Interest Fee Records</h2>
                   <div className="flex flex-col md:flex-row gap-3">
                       <div className="relative w-full md:w-[300px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by name, member ID..." 
                                className="pl-9 bg-muted/50 border-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                       </div>
                       <Select value={statusFilter} onValueChange={setStatusFilter}>
                           <SelectTrigger className="w-[130px] bg-muted/50 border-none">
                               <SelectValue placeholder="All Status" />
                           </SelectTrigger>
                           <SelectContent>
                               <SelectItem value="all">All Status</SelectItem>
                               <SelectItem value="active">Active</SelectItem>
                               <SelectItem value="pending">Pending</SelectItem>
                               <SelectItem value="overdue">Overdue</SelectItem>
                           </SelectContent>
                       </Select>
                       <Select value={monthFilter} onValueChange={setMonthFilter}>
                           <SelectTrigger className="w-[130px] bg-muted/50 border-none">
                               <SelectValue placeholder="All Month" />
                           </SelectTrigger>
                           <SelectContent>
                               <SelectItem value="all">All Month</SelectItem>
                               {uniqueMonths.map(m => (
                                   <SelectItem key={m} value={m}>{m}</SelectItem>
                               ))}
                           </SelectContent>
                       </Select>
                   </div>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="font-semibold pl-6">Member</TableHead>
                                <TableHead className="font-semibold">Month</TableHead>
                                <TableHead className="font-semibold">Amount</TableHead>
                                <TableHead className="font-semibold">Pay Date</TableHead>
                                <TableHead className="font-semibold">Method</TableHead>
                                <TableHead className="font-semibold text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <div className="flex justify-center items-center">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedRecords.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        No records found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedRecords.map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell className="pl-6">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarFallback>{record.member_name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium text-sm">{record.member_name}</p>
                                                    <p className="text-xs text-muted-foreground">{record.member_id}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {format(record.month, "MMMM yyyy")}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            ₦{record.amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            {record.pay_date ? format(new Date(record.pay_date), "d-MM-yyyy") : "-"}
                                        </TableCell>
                                        <TableCell>
                                            {record.method || "-"}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Badge 
                                                className={cn(
                                                    "rounded-full px-3 font-medium capitalize shadow-none hover:bg-opacity-80",
                                                    record.status === "active" && "bg-black text-white hover:bg-black/90",
                                                    record.status === "pending" && "bg-gray-100 text-gray-600 hover:bg-gray-200 border-none",
                                                    record.status === "overdue" && "bg-red-500 text-white hover:bg-red-600 border-none"
                                                )}
                                                variant={record.status === "active" ? "default" : "outline"}
                                            >
                                                {record.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {filteredRecords.length > 0 && (
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} results
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
