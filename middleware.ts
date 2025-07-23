import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase admin client (server-side only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 🔓 Decode the two-part Supabase cookie
function parseSupabaseAuthToken(cookie0?: string, cookie1?: string): any | null {
  if (!cookie0 || !cookie1) return null;

  try {
    const combined = cookie0 + cookie1;
    const raw = combined.replace(/^base64-/, '');
    const decoded = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));

    const jwt = decoded?.access_token;
    if (!jwt) return null;

    const base64Url = jwt.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');

    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('❌ JWT decode failed:', err);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const cookies = request.cookies.getAll();
  const cookie0 = cookies.find(c => c.name.endsWith('-auth-token.0'))?.value;
  const cookie1 = cookies.find(c => c.name.endsWith('-auth-token.1'))?.value;

  const payload = parseSupabaseAuthToken(cookie0, cookie1);
  const path = request.nextUrl.pathname;

  console.log('🔑 JWT payload:', payload);
  console.log('📂 Path:', path);

  if (!payload?.sub) {
    console.warn('⚠ No user ID found in JWT');
    return NextResponse.redirect(new URL('/', request.url));
  }

  const userId = payload.sub;

  // 🔍 Fetch user's role from the profiles table
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('❌ Failed to fetch role:', error.message);
    return NextResponse.redirect(new URL('/', request.url));
  }

  const role = profile?.role;
  console.log('🧑 Role from DB:', role);

  // 🔒 Admin protection
  if (path.startsWith('/admin')) {
    if (!role || (role !== 'admin' && role !== 'owner')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // 🔒 Dashboard protection (any logged-in role)
  if (path.startsWith('/dashboard')) {
    if (!role) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

// Apply middleware to specific routes
export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*'],
};
