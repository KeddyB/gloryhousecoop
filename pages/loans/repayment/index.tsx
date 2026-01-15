"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Banknote,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { RecordPaymentModal } from "@/components/record-payment-modal";
import { cn, formatCurrencyShort } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { format, isBefore, startOfDay } from "date-fns";
import { toast } from "sonner";
import { LoanRepaymentSummary } from "@/lib/types/loans";
import { MobileHeader } from "@/components/mobile-header";
import { useRouter } from "next/router";
import Head from "next/head";

export default function RepaymentPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [summaries, setSummaries] = useState<LoanRepaymentSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSummary, setSelectedSummary] =
    useState<LoanRepaymentSummary | null>(null);

  const fetchSummaries = useCallback(async () => {
    await Promise.resolve();
    setIsLoading(true);
    const { data, error } = await supabase.rpc("get_loan_repayment_summaries");

    if (error) {
      toast.error(`Error fetching repayments: ${error.message}`);
    } else {
      console.log("summaries>>>>>>", data);
      setSummaries(data || []);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSummaries();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchSummaries]);

  const filteredSummaries = useMemo(() => {
    return summaries
      .filter((s) => {
        const name = (s.member.name || "").toLowerCase();
        const id = (s.member.member_id || "").toLowerCase();
        const query = searchQuery.toLowerCase();
        const matchesSearch = name.includes(query) || id.includes(query);

        if (statusFilter === "all") return matchesSearch;

        const isOverdue =
          s.next_due && isBefore(new Date(s.next_due), startOfDay(new Date()));

        if (!matchesSearch) return false;

        switch (statusFilter) {
          case "overdue":
            return !!isOverdue;
          case "pending":
            return s.status === "pending" && !isOverdue;
          case "partial":
            return s.status === "partial" && !isOverdue;
          case "paid":
            return s.status === "paid";
          default:
            return true;
        }
      })
      .sort((a, b) => {
        return (
          new Date(b.latest_update).getTime() -
          new Date(a.latest_update).getTime()
        );
      });
  }, [summaries, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredSummaries.length / itemsPerPage);
  const paginatedSummaries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSummaries.slice(start, start + itemsPerPage);
  }, [filteredSummaries, currentPage]);

  const stats = useMemo(() => {
    const totalOutstanding = summaries.reduce(
      (sum, s) => sum + Number(s.remaining),
      0
    );
    const overdueCount = summaries.filter(
      (s) =>
        s.next_due && isBefore(new Date(s.next_due), startOfDay(new Date()))
    ).length;
    const totalPaid = summaries.reduce((sum, s) => sum + Number(s.paid), 0);
    const collectionRate =
      totalPaid + totalOutstanding > 0
        ? Math.round((totalPaid / (totalPaid + totalOutstanding)) * 100)
        : 0;

    return { totalOutstanding, overdueCount, totalPaid, collectionRate };
  }, [summaries]);

  const handlePaymentClick = (summary: LoanRepaymentSummary) => {
    setSelectedSummary(summary);
    setIsModalOpen(true);
  };

  return (
    <div className="flex h-screen bg-background">
      <Head>
        <title>Loans Repayment List - GloryHouseCoop</title>
      </Head>
      <Sidebar />
      <MobileHeader title="Repayment Management" onBack={() => router.back()} />
      <div className="flex-1 overflow-auto p-8">
        <div className="space-y-8 pt-[4.5rem] md:pt-0">
          {/* Header */}
          <div className="hidden md:flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Repayment Management
              </h1>
              <p className="text-muted-foreground text-base">
                Track loan repayments and manage collections
              </p>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardContent className="px-6 py-4">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Outstanding
                  </p>
                  <div className="h-8 w-8 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100 shrink-0 shadow-sm">
                    <span className="text-blue-600 font-bold text-lg">₦</span>
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-foreground truncate">
                  ₦{formatCurrencyShort(stats.totalOutstanding)}
                </h3>
              </CardContent>
            </Card>

            <Card className="shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardContent className="px-6 py-4">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Overdue Loans
                  </p>
                  <div className="h-8 w-8 bg-red-50 rounded-xl flex items-center justify-center border border-red-100 shrink-0 shadow-sm">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-foreground truncate">
                  {stats.overdueCount}
                </h3>
              </CardContent>
            </Card>

            <Card className="shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardContent className="px-6 py-4">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Collected
                  </p>
                  <div className="h-8 w-8 bg-green-50 rounded-xl flex items-center justify-center border border-green-100 shrink-0 shadow-sm">
                    <Banknote className="h-4 w-4 text-green-600" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-foreground truncate">
                  ₦{formatCurrencyShort(stats.totalPaid)}
                </h3>
              </CardContent>
            </Card>

            <Card className="shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardContent className="px-6 py-4">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Collection Rate
                  </p>
                  <div className="h-8 w-8 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100 shrink-0 shadow-sm">
                    <CheckCircle2 className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-foreground truncate">
                  {stats.collectionRate}%
                </h3>
              </CardContent>
            </Card>
          </div>

          {/* Active Loans - Repayment Status */}
          <Card className="shadow-sm rounded-2xl overflow-hidden border border-gray-100">
            <CardHeader className="pb-6">
              <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
                Active Loans - Repayment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col gap-4 px-6 pb-6">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                  <Input
                    placeholder="Search by applicant..."
                    className="pl-8 h-9 text-xs border-gray-100 bg-gray-50/50 rounded-lg focus:ring-0 focus:border-gray-200 transition-all w-full"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-9 text-xs border-gray-100 bg-gray-50/50 rounded-lg">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-[#EEEEEE]">
                    <TableHead className="h-14 px-8 text-muted-foreground font-semibold text-sm">
                      Applicant
                    </TableHead>
                    <TableHead className="h-14 font-semibold text-muted-foreground text-sm text-center">
                      Progress
                    </TableHead>
                    <TableHead className="h-14 font-semibold text-muted-foreground text-sm text-center">
                      Amount Details
                    </TableHead>
                    <TableHead className="h-14 font-semibold text-muted-foreground text-sm text-center">
                      Next Due
                    </TableHead>
                    <TableHead className="h-14 font-semibold text-muted-foreground text-sm text-center">
                      Status
                    </TableHead>
                    <TableHead className="h-14 px-8 font-semibold text-muted-foreground text-sm text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-300" />
                      </TableCell>
                    </TableRow>
                  ) : filteredSummaries.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-32 text-center text-xs text-gray-400 font-medium"
                      >
                        No repayments found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSummaries.map((s) => {
                      const isOverdue =
                        s.next_due &&
                        isBefore(new Date(s.next_due), startOfDay(new Date()));
                      const paidPercentage =
                        s.repayments > 0
                          ? (s.repayments_paid / s.repayments) * 100
                          : 0;

                      return (
                        <TableRow
                          key={s.loan_id}
                          className="border-gray-50 hover:bg-gray-50/30 transition-colors"
                        >
                          <TableCell className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-11 w-11 bg-gray-100">
                                <AvatarFallback className="text-sm font-bold text-muted-foreground">
                                  {s.member.name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p
                                  className="font-semibold text-foreground text-[15px] leading-tight truncate w-[140px]"
                                  title={s.member.name}
                                >
                                  {s.member.name}
                                </p>
                                <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase truncate">
                                  {s.member.member_id}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-center gap-1.5 min-w-30">
                              <div className="flex justify-between w-full text-xs font-semibold text-muted-foreground px-1">
                                <span>
                                  {s.repayments_paid}/{s.repayments}{" "}
                                  installments
                                </span>
                              </div>
                              <Progress
                                value={paidPercentage}
                                className="h-1.5 bg-gray-100"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-xs min-w-35">
                              <div className="flex justify-between items-center bg-gray-50/50 px-2 py-1 rounded border border-gray-100/50">
                                <span className="text-muted-foreground font-medium">
                                  Paid:
                                </span>
                                <span className="font-bold text-foreground">
                                  ₦{Number(s.paid).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-gray-50/50 px-2 py-1 rounded border border-gray-100/50">
                                <span className="text-muted-foreground font-medium">
                                  Remaining:
                                </span>
                                <span className="font-bold text-foreground">
                                  ₦{Number(s.remaining).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-gray-50/50 px-2 py-1 rounded border border-gray-100/50">
                                <span className="text-muted-foreground font-medium">
                                  Interval:
                                </span>
                                <span className="font-bold text-foreground">
                                  ₦{Number(s.interval_amount).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <p className="text-sm font-semibold text-foreground">
                                {s.next_due
                                  ? format(new Date(s.next_due), "dd-MM-yyyy")
                                  : "N/A"}
                              </p>
                              {isOverdue && (
                                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">
                                  OVERDUE
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={cn(
                                "inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border",
                                s.status === "paid"
                                  ? "border-green-500 bg-green-500 text-white"
                                  : isOverdue
                                  ? "border-red-500 bg-red-500 text-white"
                                  : s.status === "partial"
                                  ? "border-orange-500 bg-orange-500 text-white"
                                  : "border-black bg-black text-white"
                              )}
                            >
                              {s.status === "paid"
                                ? "paid"
                                : isOverdue
                                ? "overdue"
                                : s.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right px-8">
                            <Button
                              size="sm"
                              className={cn(
                                "text-xs h-9 px-4 font-bold rounded-lg gap-1.5 transition-all active:scale-95",
                                s.status === "paid"
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100"
                                  : "bg-black hover:bg-gray-800 text-white"
                              )}
                              onClick={() => handlePaymentClick(s)}
                              disabled={s.status === "paid"}
                            >
                              <ArrowRight className="h-3 w-3" />
                              Payment
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/30">
                <p className="text-sm font-medium text-muted-foreground">
                  Showing{" "}
                  <span className="text-foreground font-bold">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>{" "}
                  to{" "}
                  <span className="text-foreground font-bold">
                    {Math.min(
                      currentPage * itemsPerPage,
                      filteredSummaries.length
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="text-foreground font-bold">
                    {filteredSummaries.length}
                  </span>{" "}
                  entries
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg border-gray-200 hover:bg-white active:scale-95 transition-all disabled:opacity-50"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-8 w-8 p-0 rounded-lg text-xs font-bold transition-all active:scale-95",
                            currentPage === page
                              ? "bg-black text-white hover:bg-black"
                              : "border-gray-200 hover:bg-white text-gray-600"
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
                    className="h-8 w-8 p-0 rounded-lg border-gray-200 hover:bg-white active:scale-95 transition-all disabled:opacity-50"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
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

      <RecordPaymentModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedSummary={selectedSummary}
        onSuccess={fetchSummaries}
      />
    </div>
  );
}
