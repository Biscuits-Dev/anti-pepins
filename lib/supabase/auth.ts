import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Vérifie si la requête courante provient d'un admin authentifié.
 * À utiliser dans les API routes pour protéger les endpoints sensibles.
 */
export async function isAdminRequest(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    return user?.app_metadata?.role === 'admin';
  } catch {
    return false;
  }
}
