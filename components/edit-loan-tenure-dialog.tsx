"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"


interface Loan {
  id: string
  tenure: number
  // Add other necessary loan properties if needed
}

interface EditLoanTenureDialogProps {
  loan: Loan | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditLoanTenureDialog({
  loan,
  open,
  onOpenChange,
  onSuccess,
}: EditLoanTenureDialogProps) {
  const [tenure, setTenure] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  

  useEffect(() => {
    if (loan) {
      setTenure(String(loan.tenure))
    }
  }, [loan])

      const handleSave = async () => {
      if (!loan || !tenure.trim()) {
        setError("Tenure cannot be empty.")
        return
      }
  
      const newTenure = parseInt(tenure, 10)
      if (isNaN(newTenure) || newTenure <= 0) {
        setError("Please enter a valid positive number for tenure.")
        return
      }
  
      setIsSaving(true)
      setError(null)
  
      try {
        const response = await fetch('/api/update-loan-tenure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ loan_id: loan.id, tenure: newTenure }),
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update loan tenure.');
        }
  
        onSuccess()
        onOpenChange(false)
      } catch (error: any) {
        console.error("Error updating loan tenure:", error)
        setError(error.message || "Failed to update loan tenure. Please try again.")
      } finally {
        setIsSaving(false)
      }
    }
  const handleClose = () => {
    if (isSaving) return
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Loan Tenure</DialogTitle>
          <DialogDescription>
            Update the tenure for loan ID: {loan?.id.substring(0, 8)}...
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tenure">Tenure (in months)</Label>
            <Input
              id="tenure"
              type="number"
              value={tenure}
              onChange={(e) => setTenure(e.target.value)}
              placeholder="e.g., 12"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
