import { Member } from "../types/members";

export type LoanState =
  | "pending"
  | "approved"
  | "rejected"
  | "active"
  | "disbursed"
  | "paid"
  | "repaid";

export interface InterestPayment {
  id: string;
  loan_id: string;
  payment_for_month: string;
  amount_paid: number;
  payment_date?: string | null;
  created_at: string;
  notes?: string | null;
  created_by_name?: string | null;
  payment_method?: string | null;
}

export interface Loan {
  id: string;
  member_id: string;
  loan_amount: number;
  interest_rate: number;
  collateral_type: string;
  collateral_value: number;
  tenure: number;
  purpose: string;
  third_party_name: string;
  third_party_number: string;
  collateral_docs_url?: string;
  loan_agreement_url?: string;
  state: LoanState;
  created_at: string;
  member?: Partial<Member>;
  disbursements?: Disbursement[];
  interval: number;
  amount_paid: number;
  due_date: string;
  is_extended?: boolean;
  repayments?: Repayment[];
  interest_payments?: InterestPayment[];
}

export interface Disbursement {
  id: string;
  loan_id: string;
  disbursement_amount: number;
  method: string;
  bank_account: string;
  disbursed_by: string;
  disbursed_by_name?: string;
  notes?: string;
  created_at: string;
  loan?: Loan;
}

export interface Repayment {
  id?: string;
  loan_id?: string;
  installment_number?: number;
  due_date?: string;
  amount_due?: number;
  amount_paid?: number;
  paid_at?: string;
  status?: "paid" | "pending" | "overdue";
  created_at?: string;
  notes?: string;
  updated_at?: string;
}

export interface LoanRepaymentSummary {
  loan_id: string;
  member: {
    name: string;
    member_id: string;
    avatar_url?: string;
  };
  repayments: number;
  interval: number;
  paid: number;
  remaining: number;
  interval_amount: number;
  next_due: string;
  repayments_paid: number;
  status: string;
  latest_update: string;
}
