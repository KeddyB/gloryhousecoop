-- Create disbursements table
CREATE TABLE IF NOT EXISTS public.disbursements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    disbursement_amount NUMERIC NOT NULL CHECK (disbursement_amount > 0),
    method TEXT NOT NULL,
    bank_account TEXT NOT NULL,
    disbursed_by UUID NOT NULL REFERENCES auth.users(id),
    disbursed_by_name TEXT, -- Stores the operator's name at the time of disbursement
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.disbursements ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.disbursements;
CREATE POLICY "Enable read access for all users" ON public.disbursements
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.disbursements;
CREATE POLICY "Enable insert for authenticated users only" ON public.disbursements
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Atomic function to create disbursement and update loan state
CREATE OR REPLACE FUNCTION create_disbursement(
    p_loan_id UUID,
    p_amount NUMERIC,
    p_method TEXT,
    p_bank_account TEXT,
    p_notes TEXT,
    p_disbursed_by UUID,
    p_disbursed_by_name TEXT
) RETURNS VOID AS $$
BEGIN
    -- This function runs in a single transaction. 
    -- If any part fails, all changes are automatically rolled back.

    -- Insert disbursement record
    INSERT INTO public.disbursements (
        loan_id,
        disbursement_amount,
        method,
        bank_account,
        disbursed_by,
        disbursed_by_name,
        notes
    ) VALUES (
        p_loan_id,
        p_amount,
        p_method,
        p_bank_account,
        p_disbursed_by,
        p_disbursed_by_name,
        p_notes
    );

    -- Update loan state to 'active'
    UPDATE public.loans
    SET state = 'active'
    WHERE id = p_loan_id;
END;
$$ LANGUAGE plpgsql;
