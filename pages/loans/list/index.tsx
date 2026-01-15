"use client";

import { MobileHeader } from "@/components/mobile-header";
import { useRouter } from "next/router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  CircleDollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loan, LoanState } from "@/lib/types/loans";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Head from "next/head";

export default function LoanListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const LOANS_PER_PAGE = 10;
  const supabase = createClient();

  const fetchLoans = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("loans")
        .select(
          `
          *,
          member:members (*)
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        toast.error(`Error fetching loans: ${error.message}`);
      } else {
        setLoans(data || []);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, monthFilter]);

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      // 1. Filter by status
      if (statusFilter !== "all" && loan.state !== statusFilter) {
        return false;
      }

      // 2. Filter by search term (member name or ID)
      const searchLower = searchTerm.toLowerCase();
      const memberName = (loan.member?.name || "").toLowerCase();
      const memberId = (loan.member?.member_id || "").toLowerCase();

      const matchesSearch =
        memberName.includes(searchLower) || memberId.includes(searchLower);
      if (!matchesSearch) return false;

      // 3. Filter by month (optional, since it's in the design)
      if (monthFilter !== "all") {
        const loanDate = new Date(loan.created_at || "");
        const loanMonth = format(loanDate, "MMMM");
        if (loanMonth.toLowerCase() !== monthFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [loans, searchTerm, statusFilter, monthFilter]);

  const paginatedLoans = useMemo(() => {
    const startIndex = (currentPage - 1) * LOANS_PER_PAGE;
    return filteredLoans.slice(startIndex, startIndex + LOANS_PER_PAGE);
  }, [filteredLoans, currentPage]);

  const totalPages = Math.ceil(filteredLoans.length / LOANS_PER_PAGE);

  const stats = useMemo(() => {
    const active = loans.filter((l) => l.state === "active").length;
    const pending = loans.filter((l) => l.state === "pending").length;
    const overdue = loans.filter((l) => l.state === "rejected").length; // Placeholder for overdue if not available
    const totalDisbursed = loans
      .filter((l) => l.state === "active" || l.state === "disbursed")
      .reduce((acc, curr) => acc + (curr.loan_amount || 0), 0);

    return { active, pending, overdue, totalDisbursed };
  }, [loans]);

  const getStatusConfig = (status: LoanState, dueDate?: string) => {
    // Check for overdue (conditional render)
    if (status !== "paid" && status !== "repaid" && dueDate) {
      if (new Date() > new Date(dueDate)) {
        return {
          label: "overdue",
          className: "bg-[#E03131] text-white hover:bg-[#E03131]/90",
        };
      }
    }

    switch (status) {
      case "paid":
        return {
          label: "paid",
          className: "bg-[#2B8A3E] text-white hover:bg-[#2B8A3E]/90",
        };
      case "active":
        return {
          label: "active",
          className: "bg-black text-white hover:bg-black/90",
        };
      case "pending":
        return {
          label: "pending",
          className: "bg-[#F4F4F4] text-[#666666] hover:bg-[#F4F4F4]",
        };
      case "repaid":
        return {
          label: "closed",
          className:
            "bg-white text-[#666666] border border-[#EEEEEE] hover:bg-white",
        };
      case "rejected":
        return {
          label: "rejected",
          className: "bg-[#E03131] text-white hover:bg-[#E03131]/90",
        };
      default:
        return { label: status, className: "bg-gray-100 text-gray-800" };
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Head>
        <title>Loans List - GloryHouseCoop</title>
      </Head>
      <Sidebar />
      <MobileHeader title="Loan Management" onBack={() => router.back()} />
      <div className="flex-1 overflow-auto">
        <div className="p-10 pt-[4.5rem] md:pt-10 space-y-10">
          {/* Header */}
          <div className="hidden md:block space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-[#1A1A1A]">
              Loan Management
            </h1>
            <p className="text-[#666666] text-base font-medium">
              Track and manage all loan applications
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              label="Active Loans"
              value={stats.active}
              icon={<CheckCircle2 className="h-5 w-5 text-[#2B8A3E]" />}
              bgColor="bg-[#EBFBEE]"
            />
            <StatCard
              label="Pending"
              value={stats.pending}
              icon={<Clock className="h-5 w-5 text-[#E67700]" />}
              bgColor="bg-[#FFF4E6]"
            />
            <StatCard
              label="Overdue"
              value={stats.overdue}
              icon={<AlertCircle className="h-5 w-5 text-[#E03131]" />}
              bgColor="bg-[#FFF5F5]"
            />
            <StatCard
              label="Total Disbursed"
              value={`₦${stats.totalDisbursed.toLocaleString()}`}
              icon={<CircleDollarSign className="h-5 w-5 text-[#1971C2]" />}
              bgColor="bg-[#E7F5FF]"
            />
          </div>

          {/* Main Content */}
          <Card className="border border-[#EEEEEE] shadow-none rounded-2xl overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <div className="space-y-6">
                <CardTitle className="text-lg font-semibold text-[#1A1A1A]">
                  Loan Records
                </CardTitle>
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="relative flex-1 w-full group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#ADB5BD] group-focus-within:text-black transition-colors" />
                    <Input
                      placeholder="Search by applicant..."
                      className="pl-11 bg-[#F8F9FA] border-none h-12 text-sm rounded-xl focus-visible:ring-1 focus-visible:ring-[#EEEEEE] w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px] bg-[#F8F9FA] border-none h-12 text-sm rounded-xl px-5">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#EEEEEE] shadow-xl">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="repaid">Closed</SelectItem>
                      <SelectItem value="rejected">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="w-full md:w-[180px] bg-[#F8F9FA] border-none h-12 text-sm rounded-xl px-5">
                      <SelectValue placeholder="All Month" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#EEEEEE] shadow-xl">
                      <SelectItem value="all">All Month</SelectItem>
                      {/* Add months dynamically or manually */}
                      <SelectItem value="january">January</SelectItem>
                      <SelectItem value="february">February</SelectItem>
                      <SelectItem value="march">March</SelectItem>
                      <SelectItem value="april">April</SelectItem>
                      <SelectItem value="may">May</SelectItem>
                      <SelectItem value="june">June</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-[#EEEEEE]">
                    <TableHead className="h-14 px-8 text-[#666666] font-semibold text-sm">
                      Applicant
                    </TableHead>
                    <TableHead className="h-14 font-semibold text-[#666666] text-sm">
                      Amount
                    </TableHead>
                    <TableHead className="h-14 font-semibold text-[#666666] text-sm">
                      Progress
                    </TableHead>
                    <TableHead className="h-14 font-semibold text-[#666666] text-sm">
                      Status
                    </TableHead>
                    <TableHead className="h-14 px-8 font-semibold text-[#666666] text-sm">
                      Due Date
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <TableRow key={i} className="border-[#EEEEEE]">
                          <TableCell className="px-8 py-6 h-24">
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-20" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-40" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-8 w-20 rounded-full" />
                          </TableCell>
                          <TableCell className="px-8">
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                        </TableRow>
                      ))
                  ) : paginatedLoans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center gap-4 text-[#ADB5BD]">
                          <CircleDollarSign className="h-12 w-12 opacity-20" />
                          <p className="text-base font-medium">
                            No loan records found
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLoans.map((loan) => {
                      const statusConfig = getStatusConfig(
                        loan.state,
                        loan.due_date
                      );
                      const memberInitials = (loan.member?.name || "??")
                        .substring(0, 2)
                        .toUpperCase();

                      const amountPaid = loan.amount_paid || 0;
                      const remaining = Math.max(
                        0,
                        (loan.loan_amount || 0) - amountPaid
                      );

                      return (
                        <TableRow
                          key={loan.id}
                          className="border-[#EEEEEE] hover:bg-[#F8F9FA]/50 transition-colors cursor-pointer"
                        >
                          <TableCell className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-11 w-11 bg-[#F4F4F4]">
                                <AvatarFallback className="text-sm font-bold text-[#666666]">
                                  {memberInitials}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-[#1A1A1A] text-[15px]">
                                  {loan.member?.name}
                                </p>
                                <p className="text-xs font-semibold text-[#ADB5BD] tracking-wider uppercase">
                                  {loan.member?.member_id}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-semibold text-[#1A1A1A] text-[15px]">
                                ₦{Number(loan.loan_amount).toLocaleString()}
                              </p>
                              <p className="text-[#666666] text-xs font-medium">
                                {loan.tenure} months
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-[#666666] text-xs font-medium">
                                Paid:{" "}
                                <span className="text-[#1A1A1A] font-semibold">
                                  ₦{amountPaid.toLocaleString()}
                                </span>
                              </p>
                              <p className="text-[#666666] text-xs font-medium mt-1">
                                Remaining:{" "}
                                <span className="text-[#1A1A1A] font-semibold">
                                  ₦{remaining.toLocaleString()}
                                </span>
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "rounded-lg px-4 py-1.5 font-bold text-[10px] uppercase tracking-[0.05em] shadow-none border-none",
                                statusConfig.className
                              )}
                            >
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-8 font-semibold text-[#1A1A1A] text-[15px]">
                            {loan.due_date
                              ? format(new Date(loan.due_date), "dd/MM/yyyy")
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-8 py-5 border-t border-[#EEEEEE] flex items-center justify-between bg-white">
                <p className="text-sm font-medium text-[#666666]">
                  Showing{" "}
                  <span className="text-[#1A1A1A] font-bold">
                    {(currentPage - 1) * LOANS_PER_PAGE + 1}
                  </span>{" "}
                  to{" "}
                  <span className="text-[#1A1A1A] font-bold">
                    {Math.min(
                      currentPage * LOANS_PER_PAGE,
                      filteredLoans.length
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="text-[#1A1A1A] font-bold">
                    {filteredLoans.length}
                  </span>{" "}
                  results
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-lg border-[#EEEEEE] hover:bg-[#F8F9FA] disabled:opacity-50"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1.5 mx-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "ghost"}
                          size="sm"
                          className={cn(
                            "h-9 w-9 rounded-lg font-bold text-sm",
                            currentPage === page
                              ? "bg-black text-white hover:bg-black/90 shadow-none"
                              : "text-[#666666] hover:bg-[#F4F4F4] hover:text-[#1A1A1A]"
                          )}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      )
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-lg border-[#EEEEEE] hover:bg-[#F8F9FA] disabled:opacity-50"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  bgColor,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  bgColor: string;
}) {
  return (
    <Card className="border border-[#EEEEEE] shadow-none rounded-2xl p-6">
      <div className="flex flex-col items-start gap-4">
        <div className="flex justify-between w-full items-center">
          <div
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              bgColor
            )}
          >
            {icon}
          </div>
          <p className="text-sm font-medium text-[#666666]">{label}</p>
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">
            {value}
          </h3>
        </div>
      </div>
    </Card>
  );
}
