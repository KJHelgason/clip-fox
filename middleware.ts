import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase admin client (server-side only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get the app subdomain from environment or default
const APP_SUBDOMAIN = process.env.APP_SUBDOMAIN || 'app';
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'localhost:3000';

// 🔓 Try to extract user ID from Supabase auth cookies
function getUserIdFromCookies(cookies: { name: string; value: string }[]): string | null {
  // Debug: log all cookies
  console.log('🍪 All cookies:', cookies.map(c => c.name));

  // Try multiple cookie patterns that Supabase might use
  // Pattern 1: sb-<project-ref>-auth-token (single cookie)
  // Pattern 2: sb-<project-ref>-auth-token.0 + sb-<project-ref>-auth-token.1 (chunked)

  // Find the auth token cookie(s)
  const authTokenCookie = cookies.find(c => c.name.includes('-auth-token') && !c.name.includes('.'));
  const authToken0 = cookies.find(c => c.name.endsWith('-auth-token.0'));
  const authToken1 = cookies.find(c => c.name.endsWith('-auth-token.1'));

  let tokenValue: string | null = null;

  if (authTokenCookie?.value) {
    // Single cookie format
    tokenValue = authTokenCookie.value;
    console.log('🔑 Found single auth cookie:', authTokenCookie.name);
  } else if (authToken0?.value && authToken1?.value) {
    // Chunked cookie format
    tokenValue = authToken0.value + authToken1.value;
    console.log('🔑 Found chunked auth cookies');
  } else if (authToken0?.value) {
    // Sometimes only part 0 exists if the token is small
    tokenValue = authToken0.value;
    console.log('🔑 Found auth cookie part 0 only');
  }

  if (!tokenValue) {
    console.log('❌ No auth token cookie found');
    return null;
  }

  try {
    // Remove base64- prefix if present
    const raw = tokenValue.replace(/^base64-/, '');

    // Try to decode as base64 JSON
    let decoded: { access_token?: string };
    try {
      decoded = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
    } catch {
      // Maybe it's already JSON or a direct JWT
      try {
        decoded = JSON.parse(raw);
      } catch {
        // Maybe it's a direct JWT token
        if (raw.includes('.')) {
          decoded = { access_token: raw };
        } else {
          console.log('❌ Could not parse token value');
          return null;
        }
      }
    }

    const jwt = decoded?.access_token;
    if (!jwt) {
      console.log('❌ No access_token in decoded cookie');
      return null;
    }

    // Decode JWT payload
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      console.log('❌ Invalid JWT format');
      return null;
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
    const payload = JSON.parse(jsonPayload);

    console.log('✅ User ID from JWT:', payload.sub);
    return payload.sub || null;
  } catch (err) {
    console.error('❌ JWT decode failed:', err);
    return null;
  }
}

// Extract subdomain from hostname
function getSubdomain(hostname: string): string | null {
  // Handle localhost variants
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    // Check for app.localhost:3000 pattern
    const parts = hostname.split('.');
    if (parts.length > 1 && parts[0] !== 'www') {
      return parts[0];
    }
    return null;
  }

  // Production: extract subdomain from full hostname
  // e.g., app.clipfox.com -> app
  const parts = hostname.replace(`:${process.env.PORT || 3000}`, '').split('.');

  // If we have subdomain.domain.tld (3+ parts) and first part isn't www
  if (parts.length >= 3 && parts[0] !== 'www') {
    return parts[0];
  }

  // For domain.tld with just 2 parts, no subdomain
  if (parts.length === 2) {
    return null;
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const subdomain = getSubdomain(hostname);
  const path = request.nextUrl.pathname;
  const url = request.nextUrl.clone();

  // Skip for static files and API routes
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  // === LOCAL DEVELOPMENT ===
  // Don't use subdomain routing on localhost - cookies don't work across subdomains
  const isLocalDev = hostname.includes('localhost') || hostname.includes('127.0.0.1');

  if (isLocalDev && !hostname.startsWith('app.')) {
    // On localhost without subdomain, just serve normally
    // /dashboard/* routes work as-is
    return NextResponse.next();
  }

  // === PRODUCTION SUBDOMAIN ROUTING ===

  // If on app subdomain (app.domain.com) - production only
  if (subdomain === APP_SUBDOMAIN) {
    // Try to get user from cookies for admin route protection
    const cookies = request.cookies.getAll();
    const userId = getUserIdFromCookies(cookies);

    if (userId) {
      // Fetch user's role from the profiles table
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!error && profile) {
        const role = profile.role;

        // Admin routes require admin role
        if (path.startsWith('/admin')) {
          if (!role || (role !== 'admin' && role !== 'owner')) {
            url.pathname = '/';
            return NextResponse.redirect(url);
          }
        }
      }
    }

    // Rewrite the URL to serve from /app/* folder
    url.pathname = `/app${path === '/' ? '' : path}`;
    return NextResponse.rewrite(url);
  }

  // === MAIN DOMAIN (marketing site) - Production ===

  // Redirect /dashboard/* to app subdomain (production only)
  if (path.startsWith('/dashboard') && !isLocalDev) {
    const newPath = path.replace('/dashboard', '');
    const appUrl = new URL(newPath || '/', request.url);
    const domainParts = hostname.split('.');
    if (domainParts.length >= 2) {
      appUrl.host = `${APP_SUBDOMAIN}.${domainParts.slice(-2).join('.')}`;
    }
    return NextResponse.redirect(appUrl);
  }

  return NextResponse.next();
}

// Apply middleware to all routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
};
