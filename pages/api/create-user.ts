import { createClient } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { email, password, fullName } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
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
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto confirm email so they can login immediately
      user_metadata: {
        full_name: fullName || '',
        name: fullName || '',
      }
    })

    if (error) {
      console.error('Supabase create user error:', error)
      return res.status(400).json({ message: error.message })
    }

    return res.status(200).json({ message: 'User created successfully', user: data.user })
  } catch (err) {
    console.error('Unexpected error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
