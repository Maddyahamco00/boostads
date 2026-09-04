/**
 * Server-side API helpers for Next.js Server Components & Route Handlers
 * Uses Next.js cookies to authenticate requests against the backend.
 */
import { cookies } from 'next/headers';
import { UserProfile } from '../types';

const BACKEND_INTERNAL_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3000';

export async function getServerSession(): Promise<{ user: UserProfile | null; isAuthenticated: boolean }> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return { user: null, isAuthenticated: false };
    }

    const response = await fetch(`${BACKEND_INTERNAL_URL}/api/auth/me`, {
      headers: {
        'Cookie': `session_token=${sessionToken}`,
        'X-Requested-With': 'XMLHttpRequest',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { user: null, isAuthenticated: false };
    }

    const data = await response.json();
    if (data.success && data.user) {
      return { user: data.user, isAuthenticated: true };
    }

    return { user: null, isAuthenticated: false };
  } catch (error) {
    console.error('[api-server] Failed to resolve server session:', error);
    return { user: null, isAuthenticated: false };
  }
}
