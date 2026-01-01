"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  Search,
  Banknote,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AmountInput } from "@/components/ui/amount-input";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loan, Disbursement } from "../types";

const HISTORY_PER_PAGE = 5;

export default function DisbursementPage() {
  const supabase = createClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingLoans, setPendingLoans] = useState<Loan[]>([]);
  const [historyLoans, setHistoryLoans] = useState<Disbursement[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalHistoryCount, setTotalHistoryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [disbursementMethod, setDisbursementMethod] = useState("");
  const [disbursementAmount, setDisbursementAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPendingLoans = useCallback(async () => {
    const { data, error } = await supabase
      .from("loans")
      .select(
        `
        *,
        member:members(*)
      `
      )
      .eq("state", "pending") // Ready for disbursement after approval
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(`Error fetching loans: ${error.message}`);
    } else {
      console.log("pending loans>>>>>>>>>>>>>>", data);
      setPendingLoans(data || []);
    }
  }, [supabase, toast]);

  const fetchHistory = useCallback(async () => {
    const from = (historyPage - 1) * HISTORY_PER_PAGE;
    const to = from + HISTORY_PER_PAGE - 1;

    const { data, error, count } = await supabase
      .from("disbursements")
      .select(
        `
        *,
        loan:loans(
          *,
          member:members(*)
        )      `,
        { count: "exact" }
      )
      .range(from, to)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching history:", error);
    } else {
      setHistoryLoans(data || []);
      setTotalHistoryCount(count || 0);
    }
  }, [supabase, historyPage]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchPendingLoans(), fetchHistory()]);
      setIsLoading(false);
    };
    init();
  }, [fetchPendingLoans, fetchHistory]);

  const handleDisburseClick = (loan: Loan) => {
    setSelectedLoan(loan);
    setDisbursementAmount(loan.loan_amount.toString());
    setDisbursementMethod("");
    setNotes("");
    setIsModalOpen(true);
  };

  const handleConfirmDisbursement = async () => {
    if (!disbursementMethod) {
      toast.error("Please select a disbursement method");
      return;
    }

    setIsSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error(
        "Authentication Error: You must be logged in to perform this action"
      );
      setIsSubmitting(false);
      return;
    }

    if (!selectedLoan || !selectedLoan.id) {
      toast.error("Selection Error: No loan selected for disbursement");
      setIsSubmitting(false);
      return;
    }

    const operatorName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email ||
      "Operator";

    const { error: rpcError } = await supabase.rpc("create_disbursement", {
      p_loan_id: selectedLoan.id,
      p_amount: parseFloat(disbursementAmount.replace(/,/g, "")),
      p_method: disbursementMethod,
      p_bank_account: `${selectedLoan.member?.account_number || "N/A"} - ${
        selectedLoan.member?.bank_name || "N/A"
      }`,
      p_notes: notes,
      p_disbursed_by: user.id,
      p_disbursed_by_name: operatorName,
      p_tenure_months: selectedLoan.tenure,
      p_interval_months: selectedLoan.interval,
      p_member_id: selectedLoan.member_id,
    });

    if (rpcError) {
      console.log(rpcError);
      toast.error(`Disbursement Failed: ${rpcError.message}`);
    } else {
      toast.success("Loan disbursed successfully");
      setIsModalOpen(false);
      fetchPendingLoans();
      fetchHistory();
    }
    setIsSubmitting(false);
  };

  const filteredPending = pendingLoans.filter((loan) => {
    const name = (
      loan.member?.full_name ||
      loan.member?.name ||
      ""
    ).toLowerCase();
    const id = (loan.member?.member_id || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || id.includes(query);
  });

  const totalDisbursedToday = historyLoans
    .filter((h) => {
      if (!h.created_at) return false;
      const today = format(new Date(), "yyyy-MM-dd");
      const hDate = format(new Date(h.created_at), "yyyy-MM-dd");
      return hDate === today;
    })
    .reduce((sum, h) => sum + h.disbursement_amount, 0);

  const totalAmountPending = pendingLoans.reduce(
    (sum, loan) => sum + loan.loan_amount,
    0
  );

  const totalHistoryPages = Math.ceil(totalHistoryCount / HISTORY_PER_PAGE);

  return (
    <div className="flex h-screen bg-gray-50/50">
      <Sidebar />
      <div className="flex-1 overflow-auto p-8">
        <div className="w-full mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 uppercase">
              Loan Disbursement
            </h1>
            <p className="text-sm text-gray-500">
              Manage approved loan disbursements and payments
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400 mb-1 tracking-wider">
                    Total Pending Amount
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    ₦{totalAmountPending.toLocaleString()}
                  </h3>
                </div>
                <div className="h-10 w-10 bg-green-50 rounded-xl flex items-center justify-center border border-green-100">
                  <span className="text-green-600 font-bold text-lg">₦</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400 mb-1 tracking-wider">
                    Today&apos;s Disbursed
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    ₦{totalDisbursedToday.toLocaleString()}
                  </h3>
                </div>
                <div className="h-10 w-10 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100">
                  <Banknote className="h-5 w-5 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table: Loans Ready for Disbursement */}
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden border border-gray-100">
            <CardHeader className="flex flex-row items-center justify-between pb-6 space-y-0">
              <CardTitle className="text-sm font-bold uppercase tracking-tight text-gray-800">
                Loans Ready for Disbursement
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                <Input
                  placeholder="Search member..."
                  className="pl-8 h-9 text-xs border-gray-100 bg-gray-50/50 rounded-lg focus:ring-0 focus:border-gray-200 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-gray-100">
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-4 px-6">
                      Member Details
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">
                      Amount (₦)
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">
                      Tenure
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">
                      Interest
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">
                      Applied Date
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
                  ) : filteredPending.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-32 text-center text-xs text-gray-400 font-medium"
                      >
                        No pending loans found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPending.map((loan) => (
                      <TableRow
                        key={loan.id}
                        className="border-gray-50 hover:bg-gray-50/30 transition-colors"
                      >
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 bg-gray-100 border border-gray-200">
                              <AvatarFallback className="text-[10px] font-bold">
                                {loan.member?.name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-[11px] text-gray-900 leading-tight">
                                {loan.member?.name}
                              </p>
                              <p className="text-[10px] text-gray-400 font-mono mt-0.5 tracking-tighter">
                                {loan.member?.member_id}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-[11px] text-gray-700">
                          {loan.loan_amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center text-[11px] font-medium text-gray-500">
                          {loan.tenure} months
                        </TableCell>
                        <TableCell className="text-center text-[11px] font-medium text-gray-500">
                          {loan.interest_rate}%
                        </TableCell>
                        <TableCell className="text-center text-[10px] font-medium text-gray-400">
                          {loan.created_at
                            ? format(new Date(loan.created_at), "dd-MM-yyyy")
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <Button
                            size="sm"
                            className="bg-black hover:bg-gray-800 text-[10px] h-8 px-4 font-bold rounded-lg gap-1.5 transition-all active:scale-95"
                            onClick={() => handleDisburseClick(loan)}
                          >
                            <Banknote className="h-3 w-3" />
                            Disburse
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Table: Disbursed History */}
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden border border-gray-100">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-tight text-gray-800">
                Disbursed History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-gray-100">
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-4 px-6">
                      Member
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">
                      Amount (₦)
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">
                      Method
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">
                      Date
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-right px-6">
                      Disbursed By
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-300" />
                      </TableCell>
                    </TableRow>
                  ) : historyLoans.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-32 text-center text-xs text-gray-400 font-medium"
                      >
                        No disbursement history.
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyLoans.map((history) => (
                      <TableRow
                        key={history.id}
                        className="border-gray-50 hover:bg-gray-50/30 transition-colors"
                      >
                        <TableCell className="px-6 py-4 font-bold text-[11px] text-gray-900">
                          {history.loan?.member?.name}
                        </TableCell>
                        <TableCell className="text-center font-bold text-[11px] text-gray-700">
                          {history.disbursement_amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-tighter border border-gray-100 text-gray-500 bg-gray-50/50">
                            {history.method}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-[10px] font-medium text-gray-400">
                          {history.created_at
                            ? format(new Date(history.created_at), "dd-MM-yyyy")
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right px-6 text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                          {history.disbursed_by_name || history.disbursed_by}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {totalHistoryPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">
                    Page {historyPage} of {totalHistoryPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 rounded-lg border-gray-100 p-0 hover:bg-gray-50"
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 rounded-lg border-gray-100 p-0 hover:bg-gray-50"
                      disabled={historyPage === totalHistoryPages}
                      onClick={() => setHistoryPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className={cn(
            "sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-4xl bg-white font-sans",
            "animate-in fade-in zoom-in-95 duration-300",
            "max-h-[80vh]"
          )}
        >
          <ScrollArea className="max-h-[80vh]">
            <div className="p-10 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-xl font-medium tracking-tight text-gray-900 border-none">
                  Disburse Loan
                </DialogTitle>
              </DialogHeader>

              {selectedLoan && (
                <div className="space-y-4">
                  {/* Info Card */}
                  <Card className="bg-gray-50/30 border border-gray-100/50 rounded-2xl shadow-none">
                    <CardContent className="p-4 grid grid-cols-2 gap-x-12 gap-y-6">
                      <div className="space-y-1.5">
                        <p className="text-[13px] font-medium text-gray-400">
                          Member
                        </p>
                        <p className="text-lg font-semibold text-gray-900 leading-none">
                          {selectedLoan.member?.full_name ||
                            selectedLoan.member?.name}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[13px] font-medium text-gray-400">
                          Loan Amount
                        </p>
                        <p className="text-lg font-semibold text-gray-900 leading-none">
                          ₦{selectedLoan.loan_amount.toLocaleString()}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[13px] font-medium text-gray-400">
                          Interest Rate
                        </p>
                        <p className="text-lg font-semibold text-gray-900 leading-none">
                          {selectedLoan.interest_rate}%
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[13px] font-medium text-gray-400">
                          Bank Account
                        </p>
                        <p className="text-lg font-semibold text-gray-900 leading-none">
                          {selectedLoan.member?.account_number} -{" "}
                          {selectedLoan.member?.bank_name}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Form Inputs */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                      <label className="text-[15px] font-semibold text-gray-900 ml-0.5">
                        Disbursement Amount
                      </label>
                      <div className="relative">
                        <AmountInput
                          value={disbursementAmount}
                          readOnly
                          onValueChange={(val) => setDisbursementAmount(val)}
                          className="bg-[#F4F4F4] border-none text-[15px] p-4 h-14 font-medium rounded-xl focus-visible:ring-1 ring-gray-200"
                          placeholder="N0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-[15px] font-semibold text-gray-900 ml-0.5">
                        Disbursement Method
                      </label>
                      <Select
                        value={disbursementMethod}
                        onValueChange={setDisbursementMethod}
                      >
                        <SelectTrigger className="bg-[#F4F4F4] border-none h-14 text-[15px] font-medium rounded-xl focus:ring-1 ring-gray-200 w-full">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                          <SelectItem
                            value="Bank Transfer"
                            className="text-[15px]"
                          >
                            Bank Transfer
                          </SelectItem>
                          <SelectItem value="Cash" className="text-[15px]">
                            Cash
                          </SelectItem>
                          <SelectItem
                            value="Mobile Transfer"
                            className="text-[15px]"
                          >
                            Mobile Transfer
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <label className="text-[15px] font-semibold text-gray-900 ml-0.5">
                      Notes* (Optional)
                    </label>
                    <Textarea
                      placeholder="Add any notes about the disbursement..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="bg-[#F4F4F4] border-none min-h-[110px] text-[15px] font-medium rounded-2xl resize-none py-4 px-5 focus-visible:ring-1 ring-gray-200 placeholder:text-gray-400"
                    />
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
                      className="h-12 px-8 bg-black hover:bg-black/90 text-white text-[15px] font-semibold rounded-xl active:scale-95 transition-all min-w-[200px]"
                      onClick={handleConfirmDisbursement}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        "Confirm Disbursement"
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
