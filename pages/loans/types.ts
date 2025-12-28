import { Member } from "../members/types";

export type LoanState =
  | "pending"
  | "approved"
  | "rejected"
  | "disbursed"
  | "repaid";

export interface Loan {
  id?: string;
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
  created_at?: string;
  member?: Partial<Member>;
}
