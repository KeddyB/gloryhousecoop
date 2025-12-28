import { createClient } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Check for service role key
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ message: 'Server configuration error: Missing Service Role Key' })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      console.error('Supabase auth error:', error)
      return res.status(500).json({ message: error.message })
    }

    // Map to a cleaner structure for the frontend
    const mappedUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.user_metadata?.full_name || u.user_metadata?.name || 'System User',
      status: u.banned_until ? 'suspended' : (u.email_confirmed_at ? 'active' : 'pending'),
      created_at: u.created_at
    }))

    return res.status(200).json(mappedUsers)
  } catch (err: any) {
    console.error('Unexpected error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
