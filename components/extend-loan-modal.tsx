import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, TrendingUp, DollarSign, Clock } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Loan } from "@/lib/types/loans";
import { format, addMonths, formatDate } from "date-fns";

interface ExtendLoanModalProps {
  loan: Loan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ExtendLoanModal: React.FC<ExtendLoanModalProps> = ({
  loan,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [selectedExtension, setSelectedExtension] = useState<number | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  // Reset selection when modal opens/changes loan
  useEffect(() => {
    if (open) {
      setSelectedExtension(null);
    }
  }, [open, loan]);

  if (!loan) return null;

  const interval = Number(loan.interval) || 1;
  const remainingBalance = (loan.loan_amount || 0) - (loan.amount_paid || 0);

  // Calculate options as multiples of the interval
  const options = [1, 2, 3, 4].map((multiplier) => multiplier * interval);

  const handleExtend = async () => {
    if (!selectedExtension || !loan.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("extend_loan", {
        p_loan_id: loan.id,
        p_extension_months: selectedExtension,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to extend loan");
      }

      toast.success(
        `Loan extended by ${selectedExtension} months successfully!`
      );
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Error extending loan:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred while extending the loan";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate preview values
  const currentUnpaidCount =
    loan.repayments?.filter((r) => r.status !== "paid").length || 0;
  const newInstallmentsCount = selectedExtension
    ? selectedExtension / interval
    : 0;
  const totalNewInstallments = currentUnpaidCount + newInstallmentsCount;
  const newInstallmentAmount = selectedExtension
    ? remainingBalance / totalNewInstallments
    : null;

  const currentDueDate = loan.due_date ? new Date(loan.due_date) : new Date();
  const newDueDate = selectedExtension
    ? addMonths(currentDueDate, selectedExtension)
    : currentDueDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125 border-none shadow-2xl overflow-hidden p-0 bg-background">
        <div className="bg-linear-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 p-6 border-b">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <DialogTitle className="text-xl">Extend Loan Tenure</DialogTitle>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Status Pills */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 p-3 rounded-xl border border-border/50">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">
                Remaining Balance
              </p>
              <p className="text-lg font-bold">
                ₦{remainingBalance.toLocaleString()}
              </p>
            </div>
            <div className="bg-muted/50 p-3 rounded-xl border border-border/50">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">
                Current Due Date
              </p>
              <p className="text-lg font-bold">
                {formatDate(loan.due_date, "MMM dd, yyyy")}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold mb-3 block text-foreground/80">
              Select Extension Period
            </label>
            <div className="grid grid-cols-2 gap-3">
              {options.map((months) => (
                <div
                  key={months}
                  onClick={() => setSelectedExtension(months)}
                  className={`
                    relative group cursor-pointer p-4 rounded-xl border-2 transition-all duration-200
                    ${
                      selectedExtension === months
                        ? "border-blue-600 bg-blue-50/50 shadow-md ring-1 ring-blue-600/20"
                        : "border-border hover:border-blue-300 hover:bg-muted/30"
                    }
                  `}
                >
                  <div className="flex justify-between items-start">
                    <span
                      className={`text-lg font-bold ${
                        selectedExtension === months
                          ? "text-blue-700"
                          : "text-foreground"
                      }`}
                    >
                      +{months}{" "}
                      <span className="text-sm font-medium">Months</span>
                    </span>
                    {selectedExtension === months && (
                      <div className="h-4 w-4 rounded-full bg-blue-600 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedExtension && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <Card className="border-blue-100 bg-blue-50/30 overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>New Interval Payment</span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5"
                    >
                      ₦
                      {newInstallmentAmount?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>New Maturity Date</span>
                    </div>
                    <span className="font-semibold">
                      {format(newDueDate, "MMM dd, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>New Total Tenure</span>
                    </div>
                    <span className="font-semibold text-blue-700">
                      {(loan.tenure || 0) + selectedExtension} Months
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-muted/30 border-t flex flex-row sm:justify-between items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExtend}
            disabled={!selectedExtension || isLoading}
            className="flex-2 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm Extension"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
