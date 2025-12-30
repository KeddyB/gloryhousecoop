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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Banknote,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { format, isBefore, startOfDay } from "date-fns";
import { LoanRepaymentSummary, Repayment } from "../types";

export default function RepaymentPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [summaries, setSummaries] = useState<LoanRepaymentSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSummary, setSelectedSummary] =
    useState<LoanRepaymentSummary | null>(null);
  const [upcomingInstallments, setUpcomingInstallments] = useState<Repayment[]>(
    []
  );
  const [isFetchingInstallments, setIsFetchingInstallments] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [paymentDate, setPaymentDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSummaries = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.rpc("get_loan_repayment_summaries");

    if (error) {
      toast({
        title: "Error fetching repayments",
        description: error.message,
        variant: "destructive",
      });
    } else {
      console.log("summaries>>>>>>", data);
      setSummaries(data || []);
    }
    setIsLoading(false);
  }, [supabase, toast]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const filteredSummaries = useMemo(() => {
    return summaries.filter((s) => {
      const name = (s.member.name || "").toLowerCase();
      const id = (s.member.member_id || "").toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = name.includes(query) || id.includes(query);

      if (statusFilter === "all") return matchesSearch;

      const isOverdue =
        s.next_due && isBefore(new Date(s.next_due), startOfDay(new Date()));
      if (statusFilter === "overdue") return matchesSearch && isOverdue;
      if (statusFilter === "active") return matchesSearch && !isOverdue;

      return matchesSearch;
    });
  }, [summaries, searchQuery, statusFilter]);

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

  const handlePaymentClick = async (summary: LoanRepaymentSummary) => {
    setSelectedSummary(summary);
    setPaymentAmount(summary.interval_amount.toString());
    setIsModalOpen(true);

    // Fetch upcoming installments for this loan
    setIsFetchingInstallments(true);
    const { data, error } = await supabase
      .from("repayments")
      .select("*")
      .eq("loan_id", summary.loan_id)
      .neq("status", "paid")
      .order("installment_number", { ascending: true })
      .limit(1);

    if (error) {
      console.error("Error fetching installments:", error);
    } else {
      setUpcomingInstallments(data || []);
    }
    setIsFetchingInstallments(false);
  };

  const handleConfirmPayment = async () => {
    if (!selectedSummary || upcomingInstallments.length === 0) return;

    setIsSubmitting(true);
    const installment = upcomingInstallments[0];
    const amount = parseFloat(paymentAmount);

    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("repayments")
      .update({
        amount_paid: installment.amount_paid + amount,
        paid_at: new Date(paymentDate).toISOString(),
        status:
          installment.amount_paid + amount >= installment.amount_due
            ? "paid"
            : "pending",
        notes: notes ? notes : installment.notes,
      })
      .eq("id", installment.id);

    if (error) {
      toast({
        title: "Payment Recording Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
      setIsModalOpen(false);
      fetchSummaries();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="flex h-screen bg-gray-50/50">
      <Sidebar />
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 uppercase">
                Repayment Management
              </h1>
              <p className="text-sm text-gray-500">
                Track loan repayments and manage collections
              </p>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">
                    Total Outstanding
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    ₦{stats.totalOutstanding.toLocaleString()}
                  </h3>
                </div>
                <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                  <span className="text-blue-600 font-bold text-lg">₦</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">
                    Overdue Loans
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {stats.overdueCount}
                  </h3>
                </div>
                <div className="h-10 w-10 bg-red-50 rounded-xl flex items-center justify-center border border-red-100">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">
                    Total Collected
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    ₦{stats.totalPaid.toLocaleString()}
                  </h3>
                </div>
                <div className="h-10 w-10 bg-green-50 rounded-xl flex items-center justify-center border border-green-100">
                  <Banknote className="h-5 w-5 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">
                    Collection Rate
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {stats.collectionRate}%
                  </h3>
                </div>
                <div className="h-10 w-10 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100">
                  <CheckCircle2 className="h-5 w-5 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Loans - Repayment Status */}
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden border border-gray-100">
            <CardHeader className="flex flex-row items-center justify-between pb-6 space-y-0">
              <CardTitle className="text-sm font-bold uppercase tracking-tight text-gray-800">
                Active Loans - Repayment Status
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                  <Input
                    placeholder="Search by applicant..."
                    className="pl-8 h-9 text-xs border-gray-100 bg-gray-50/50 rounded-lg focus:ring-0 focus:border-gray-200 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-30 h-9 text-xs border-gray-100 bg-gray-50/50 rounded-lg">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-gray-100">
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-4 px-6">
                      Applicant
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">
                      Progress
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">
                      Amount Details
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">
                      Next Due
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">
                      Status
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-right px-6">
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
                    filteredSummaries.map((s) => {
                      const isOverdue =
                        s.next_due &&
                        isBefore(new Date(s.next_due), startOfDay(new Date()));
                      const paidPercentage =
                        (s.repayments_paid / s.repayments) * 100;

                      return (
                        <TableRow
                          key={s.loan_id}
                          className="border-gray-50 hover:bg-gray-50/30 transition-colors"
                        >
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 bg-gray-100 border border-gray-200">
                                <AvatarFallback className="text-[10px] font-bold">
                                  {s.member.name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-[11px] text-gray-900 leading-tight">
                                  {s.member.name}
                                </p>
                                <p className="text-[10px] text-gray-400 font-mono mt-0.5 tracking-tighter">
                                  {s.member.member_id}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-center gap-1.5 min-w-30">
                              <div className="flex justify-between w-full text-[10px] font-medium text-gray-500 px-1">
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
                          <TableCell className="text-center">
                            <div className="inline-grid grid-cols-[auto,1fr] gap-x-3 text-[10px] leading-relaxed">
                              <span className="text-gray-400 text-left">
                                Paid:
                              </span>
                              <span className="font-bold text-gray-700 text-right">
                                ₦{Number(s.paid).toLocaleString()}
                              </span>
                              <span className="text-gray-400 text-left">
                                Remaining:
                              </span>
                              <span className="font-bold text-gray-700 text-right">
                                ₦{Number(s.remaining).toLocaleString()}
                              </span>
                              <span className="text-gray-400 text-left">
                                Interval:
                              </span>
                              <span className="font-bold text-gray-700 text-right">
                                ₦{Number(s.interval_amount).toLocaleString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <p className="text-[11px] font-bold text-gray-700">
                                {s.next_due
                                  ? format(new Date(s.next_due), "dd-MM-yyyy")
                                  : "N/A"}
                              </p>
                              {isOverdue && (
                                <p className="text-[9px] font-bold text-red-500 uppercase tracking-tighter">
                                  OVERDUE
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-tighter border",
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
                          <TableCell className="text-right px-6">
                            <Button
                              size="sm"
                              className="bg-black hover:bg-gray-800 text-[10px] h-8 px-4 font-bold rounded-lg gap-1.5 transition-all active:scale-95"
                              onClick={() => handlePaymentClick(s)}
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
          </Card>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className={cn(
            "sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-4xl bg-white font-sans",
            "animate-in fade-in zoom-in-95 duration-300",
            "max-h-[90vh]"
          )}
        >
          <ScrollArea className="max-h-[80vh]">
            <div className="p-10 space-y-8">
              <DialogHeader>
                <DialogTitle className="text-xl font-medium tracking-tight text-gray-900 border-none">
                  Record Payment
                </DialogTitle>
              </DialogHeader>

              {selectedSummary && (
                <div className="space-y-8">
                  {/* Summary Card */}
                  <Card className="bg-gray-50/30 border border-gray-100/50 rounded-2xl shadow-none">
                    <CardContent className="p-8 grid grid-cols-2 gap-x-12 gap-y-8">
                      <div className="space-y-1.5">
                        <p className="text-[13px] font-medium text-gray-400">
                          Member
                        </p>
                        <p className="text-lg font-semibold text-gray-900 leading-none">
                          {selectedSummary.member.name}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[13px] font-medium text-gray-400">
                          Remaining Balance
                        </p>
                        <p className="text-lg font-semibold text-gray-900 leading-none">
                          ₦{Number(selectedSummary.remaining).toLocaleString()}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[13px] font-medium text-gray-400">
                          Installment Amount
                        </p>
                        <p className="text-lg font-semibold text-gray-900 leading-none">
                          ₦
                          {Number(
                            selectedSummary.interval_amount
                          ).toLocaleString()}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[13px] font-medium text-gray-400">
                          Next Due Date
                        </p>
                        <p className="text-lg font-semibold text-gray-900 leading-none">
                          {selectedSummary.next_due
                            ? format(
                                new Date(selectedSummary.next_due),
                                "dd-MM-yyyy"
                              )
                            : "N/A"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Form fields */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2.5">
                        <label className="text-[15px] font-semibold text-gray-900 ml-0.5">
                          Payment Amount
                        </label>
                        <Input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="bg-[#F4F4F4] border-none h-14 text-[15px] font-medium rounded-xl focus:ring-1 ring-gray-200"
                        />
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-[15px] font-semibold text-gray-900 ml-0.5">
                          Payment Method
                        </label>
                        <Select
                          value={paymentMethod}
                          onValueChange={setPaymentMethod}
                        >
                          <SelectTrigger className="bg-[#F4F4F4] border-none h-14 text-[15px] font-medium rounded-xl focus:ring-1 ring-gray-200">
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                            <SelectItem value="Bank Transfer">
                              Bank Transfer
                            </SelectItem>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Mobile Transfer">
                              Mobile Transfer
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-[15px] font-semibold text-gray-900 ml-0.5">
                        Payment Date
                      </label>
                      <div className="relative">
                        <Input
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="bg-[#F4F4F4] border-none h-14 text-[15px] font-medium rounded-xl focus:ring-1 ring-gray-200 pl-4"
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-[15px] font-semibold text-gray-900 ml-0.5">
                        Notes (Optional)
                      </label>
                      <Textarea
                        placeholder="Add any notes about the payment..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="bg-[#F4F4F4] border-none min-h-30 text-[15px] font-medium rounded-2xl resize-none py-4 px-5 focus-visible:ring-1 ring-gray-200 placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  {/* Footer Buttons */}
                  <div className="flex justify-end gap-4 pt-4">
                    <Button
                      variant="outline"
                      className="h-12 px-8 border-gray-200 text-[15px] font-semibold rounded-xl hover:bg-gray-50 active:scale-95 transition-all w-32"
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="h-12 px-8 bg-black hover:bg-black/90 text-white text-[15px] font-semibold rounded-xl active:scale-95 transition-all min-w-50"
                      onClick={handleConfirmPayment}
                      disabled={isSubmitting || isFetchingInstallments}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        "Confirm Payment"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
