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
    return res.status(400).json({ message: 'Missing user ID' })
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
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)

    if (error) {
      console.error('Supabase delete user error:', error)
      return res.status(500).json({ message: error.message })
    }

    return res.status(200).json({ message: 'User deleted successfully' })
  } catch (err) {
    console.error('Unexpected error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
