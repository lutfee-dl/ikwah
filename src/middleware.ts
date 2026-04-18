import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const adminToken = request.cookies.get('adminToken')?.value;

  // Convenience redirect from /admin to the login directly or the deposits page
  if (request.nextUrl.pathname === '/admin') {
    const url = request.nextUrl.clone();
    url.pathname = adminToken ? '/admin/deposits' : '/admin/login';
    return NextResponse.redirect(url);
  }

  // Protect /admin routes (except login)
  if (request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin/login')) {
    if (!adminToken) {
      // If no admin token, redirect to login
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }

  // Redirect admin/login to admin dashboard if already logged in
  if (request.nextUrl.pathname.startsWith('/admin/login')) {
    if (adminToken) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/deposits';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/admin'],
};
