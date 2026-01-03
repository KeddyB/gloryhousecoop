import { createClient } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { member_id, updates } = req.body

  if (!member_id || !updates) {
    return res.status(400).json({ message: 'Missing member_id or updates' })
  }

  // Initialize Supabase Admin Client (Server-side only)
  // This requires SERVICE_ROLE_KEY to bypass RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { error, data } = await supabaseAdmin
      .from('members')
      .update(updates)
      .eq('member_id', member_id)
      .select()

    if (error) {
      console.error('Supabase update error:', error)
      return res.status(500).json({ message: error.message })
    }
    
    return res.status(200).json({ message: 'Member updated successfully', data })
  } catch (err) {
    console.error('Unexpected error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
