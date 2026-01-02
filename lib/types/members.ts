export type MemberStatus = "active" | "inactive" | "suspended";

export interface Member {
  id?: string;
  member_id: string;
  name: string;
  full_name?: string; // Optional because sometimes it's aliased or use instead of name
  phone: string;
  email: string;
  location: string;
  status: MemberStatus;
  account_number: string;
  bank_name: string;
  nominee_name?: string;
  nominee_phone?: string;
  created_at?: string;
}
