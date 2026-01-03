import { createClient } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Missing or invalid member ID' })
  }

  // Initialize Supabase Admin Client (Server-side only)
  // This requires SERVICE_ROLE_KEY to bypass RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { error, count } = await supabaseAdmin
      .from('members')
      .delete({ count: 'exact' })
      .eq('id', id)

    if (error) {
      console.error('Supabase delete error:', error)
      return res.status(500).json({ message: error.message })
    }

    if (count === 0) {
        // Try fallback to member_id if id didn't work (though id is preferred)
        const { error: error2, count: count2 } = await supabaseAdmin
            .from('members')
            .delete({ count: 'exact' })
            .eq('member_id', id)

        if (error2) {
            return res.status(500).json({ message: error2.message })
        }

        if (count2 === 0) {
            return res.status(404).json({ message: 'Member not found or already deleted' })
        }
    }

    return res.status(200).json({ message: 'Member deleted successfully' })
  } catch (err) {
    console.error('Unexpected error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
