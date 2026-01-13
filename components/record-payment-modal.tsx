"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { AmountInput } from "@/components/ui/amount-input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { LoanRepaymentSummary, Repayment } from "@/lib/types/loans";
import { createClient } from "@/utils/supabase/client";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSummary: LoanRepaymentSummary | null;
  onSuccess: () => void;
}

export function RecordPaymentModal({
  isOpen,
  onOpenChange,
  selectedSummary,
  onSuccess,
}: RecordPaymentModalProps) {
  const supabase = useMemo(() => createClient(), []);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAmountInvalid, setIsAmountInvalid] = useState(false);
  const [upcomingInstallments, setUpcomingInstallments] = useState<Repayment[]>(
    []
  );
  const [isFetchingInstallments, setIsFetchingInstallments] = useState(false);

  // Fetch installments when modal opens or selectedSummary changes
  useEffect(() => {
    if (!isOpen || !selectedSummary) return;

    const fetchInstallments = async () => {
      setIsFetchingInstallments(true);
      const { data, error } = await supabase
        .from("repayments")
        .select("*")
        .eq("loan_id", selectedSummary.loan_id)
        .neq("status", "paid")
        .order("due_date", { ascending: true });

      if (error) {
        console.error("Error fetching installments:", error);
        toast.error("Failed to fetch upcoming installments");
      } else {
        setUpcomingInstallments(data || []);
        const installment = data?.[0];
        if (installment) {
          setPaymentAmount(
            (
              (installment.amount_due ?? 0) - (installment.amount_paid ?? 0)
            ).toString()
          );
        } else {
          setPaymentAmount(selectedSummary.interval_amount.toString());
        }
      }
      setIsFetchingInstallments(false);
    };

    fetchInstallments();
  }, [isOpen, selectedSummary, supabase]);

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setNotes("");
      setIsAmountInvalid(false);
      setUpcomingInstallments([]);
    } else {
      setPaymentMethod("Bank Transfer");
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedSummary || upcomingInstallments.length === 0) return;

    setIsSubmitting(true);
    const amount = parseFloat(paymentAmount);
    const totalRemaining = Number(selectedSummary.remaining);

    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid payment amount");
      setIsSubmitting(false);
      return;
    }

    if (amount > totalRemaining) {
      toast.error(
        `Payment cannot exceed the total remaining balance of ₦${totalRemaining.toLocaleString()}`
      );
      setIsSubmitting(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const operatorName =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email ||
      "Operator";

    const { error } = await supabase.rpc("record_repayment_redistributed", {
      p_loan_id: selectedSummary.loan_id,
      p_amount: amount,
      p_notes: notes || "",
      p_created_by: operatorName,
    });

    if (error) {
      toast.error(`Payment Recording Failed: ${error.message}`);
    } else {
      toast.success("Payment recorded successfully");
      onOpenChange(false);
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-4xl bg-white font-sans",
          "animate-in fade-in zoom-in-95 duration-300",
          "max-h-[90vh]"
        )}
      >
        <ScrollArea className="max-h-[80vh]">
          <div className="p-10 space-y-4">
            <DialogHeader className="p-0">
              <DialogTitle className="sr-only">Record Payment</DialogTitle>
            </DialogHeader>

            {selectedSummary && (
              <div className="space-y-4">
                {/* Status & Installment Info */}
                <div className="flex items-center justify-between px-1">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      Current Milestone
                    </p>
                    <h4 className="text-sm font-bold text-gray-900">
                      Installment{" "}
                      {upcomingInstallments[0]?.installment_number || 0} of{" "}
                      {selectedSummary.repayments}
                    </h4>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      Remaining for this installment
                    </p>
                    <h4
                      className={cn(
                        "text-sm font-bold",
                        isAmountInvalid ? "text-red-500" : "text-black"
                      )}
                    >
                      ₦
                      {(upcomingInstallments[0]
                        ? (upcomingInstallments[0].amount_due ?? 0) -
                          (upcomingInstallments[0].amount_paid ?? 0)
                        : 0
                      ).toLocaleString()}
                    </h4>
                  </div>
                </div>

                {/* Summary Card */}
                <Card className="bg-gray-50/30 border border-gray-100/50 rounded-2xl shadow-none">
                  <CardContent className="p-8 grid grid-cols-2 gap-x-12 gap-y-8">
                    <div className="space-y-1">
                      <p className="text-[13px] font-medium text-gray-400">
                        Member
                      </p>
                      <p className="text-lg font-semibold text-gray-900 leading-none">
                        {selectedSummary.member.name}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[13px] font-medium text-gray-400">
                        Remaining Balance
                      </p>
                      <p className="text-lg font-semibold text-gray-900 leading-none">
                        ₦{Number(selectedSummary.remaining).toLocaleString()}
                      </p>
                    </div>

                    <div className="space-y-1">
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

                    <div className="space-y-1">
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
                      <div className="relative">
                        <AmountInput
                          value={paymentAmount}
                          onValueChange={(val) => {
                            setPaymentAmount(val);
                            if (selectedSummary) {
                              const totalRemaining = Number(
                                selectedSummary.remaining
                              );
                              setIsAmountInvalid(
                                parseFloat(val) > totalRemaining
                              );
                            }
                          }}
                          className={cn(
                            "bg-[#F4F4F4] border-none text-[15px] font-medium rounded-xl focus:ring-1 transition-all",
                            isAmountInvalid
                              ? "ring-2 ring-red-500 bg-red-50 text-red-900"
                              : "ring-gray-200"
                          )}
                        />
                        {isAmountInvalid && (
                          <p className="text-[10px] font-bold text-red-500 absolute -bottom-5 left-1 uppercase tracking-tight">
                            Amount exceeds remaining balance
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[15px] font-semibold text-gray-900 ml-0.5">
                        Payment Method
                      </label>
                      <Select
                        value={paymentMethod}
                        onValueChange={setPaymentMethod}
                      >
                        <SelectTrigger className="bg-[#F4F4F4] border-none h-14 text-[15px] font-medium rounded-xl focus:ring-1 ring-gray-200 w-full">
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
                          <SelectItem value="Cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
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
                      className="bg-[#F4F4F4] border-none min-h-30 text-[15px] font-medium rounded-2xl resize-none px-5 focus-visible:ring-1 ring-gray-200 placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    variant="outline"
                    className="h-12 px-8 border-gray-200 text-[15px] font-semibold rounded-xl hover:bg-gray-50 active:scale-95 transition-all w-32"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className={cn(
                      "h-12 px-8 text-white text-[15px] font-semibold rounded-xl active:scale-95 transition-all min-w-50",
                      isAmountInvalid
                        ? "bg-red-500 hover:bg-red-600 disabled:opacity-70"
                        : "bg-black hover:bg-black/90"
                    )}
                    onClick={handleConfirmPayment}
                    disabled={
                      isSubmitting || isFetchingInstallments || isAmountInvalid
                    }
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
  );
}
