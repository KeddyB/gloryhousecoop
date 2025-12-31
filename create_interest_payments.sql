-- Create interest_payments table
CREATE TABLE IF NOT EXISTS interest_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loan_id UUID REFERENCES loans(id) NOT NULL,
    amount_paid NUMERIC NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_for_month DATE NOT NULL, -- The first day of the month this payment is for (e.g., '2025-01-01')
    payment_method TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE interest_payments ENABLE ROW LEVEL SECURITY;

-- Create policy for reading
CREATE POLICY "Enable read access for authenticated users" ON interest_payments
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policy for inserting
CREATE POLICY "Enable insert access for authenticated users" ON interest_payments
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create a helper function/RPC to get interest stats if needed, 
-- but we can do it client side for now with small data.
