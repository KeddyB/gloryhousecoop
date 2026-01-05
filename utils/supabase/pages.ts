import { createPagesServerClient } from '@supabase/ssr'
import type { NextApiRequest, NextApiResponse } from 'next'

export function createClient(req: NextApiRequest, res: NextApiResponse) {
  return createPagesServerClient({ req, res });
}
