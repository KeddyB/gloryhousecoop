-- 1. Ensure the member_id column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'member_id') THEN
        ALTER TABLE members ADD COLUMN member_id TEXT;
    END IF;
END $$;

-- 2. Add a unique constraint to member_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'members_member_id_key') THEN
        ALTER TABLE members ADD CONSTRAINT members_member_id_key UNIQUE (member_id);
    END IF;
END $$;

-- 3. Create a function to generate a random MEM ID
CREATE OR REPLACE FUNCTION generate_unique_member_id()
RETURNS TRIGGER AS $$
DECLARE
    new_id TEXT;
    exists_count INT;
BEGIN
    LOOP
        -- Generate a random 6-digit number and prepend 'MEM'
        -- 'fm000000' ensures leading zeros if the number is small
        new_id := 'MEM' || TO_CHAR(FLOOR(RANDOM() * 1000000), 'fm000000');
        
        -- Check if this ID already exists
        SELECT COUNT(*) INTO exists_count FROM members WHERE member_id = new_id;
        
        -- If unique, break the loop
        IF exists_count = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    
    -- Assign the new ID
    NEW.member_id := new_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a trigger to automatically assign member_id on INSERT
DROP TRIGGER IF EXISTS ensure_member_id ON members;
CREATE TRIGGER ensure_member_id
BEFORE INSERT ON members
FOR EACH ROW
WHEN (NEW.member_id IS NULL OR NEW.member_id = '')
EXECUTE FUNCTION generate_unique_member_id();

-- 5. Update existing rows that don't have a valid member_id
UPDATE members
SET member_id = 'MEM' || TO_CHAR(FLOOR(RANDOM() * 1000000), 'fm000000')
WHERE member_id IS NULL OR member_id NOT LIKE 'MEM%';

-- 6. Ensure Row Level Security (RLS) policies allow reading
-- This is often why data doesn't show up in the frontend
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts (optional, careful with this in prod)
DROP POLICY IF EXISTS "Enable read access for all users" ON members;

-- Create a policy to allow read access to everyone (or restrict to authenticated)
CREATE POLICY "Enable read access for all users" ON members
    FOR SELECT USING (true);
