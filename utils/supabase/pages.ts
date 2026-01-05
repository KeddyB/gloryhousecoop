import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextApiRequest, type NextApiResponse } from 'next'

export const createClient = (req: NextApiRequest, res: NextApiResponse) => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies[name]
        },
        set(name: string, value: string, options: CookieOptions) {
          // A simplified cookie setting logic. For robust implementation, a library like 'cookie' is recommended.
          const cookieParts = [`${name}=${value}`, `Path=${options.path || '/'}`];
          if (options.maxAge) {
            cookieParts.push(`Max-Age=${options.maxAge}`);
          }
          if (options.httpOnly) {
            cookieParts.push('HttpOnly');
          }
          if (options.sameSite) {
            cookieParts.push(`SameSite=${options.sameSite}`);
          }
          res.setHeader('Set-Cookie', cookieParts.join('; '));
        },
        remove(name: string, options: CookieOptions) {
          // A simplified cookie removal logic.
          const cookieParts = [`${name}=`, `Path=${options.path || '/'}`, 'Max-Age=0'];
          if (options.httpOnly) {
            cookieParts.push('HttpOnly');
          }
          if (options.sameSite) {
            cookieParts.push(`SameSite=${options.sameSite}`);
          }
          res.setHeader('Set-Cookie', cookieParts.join('; '));
        },
      },
    }
  )
}