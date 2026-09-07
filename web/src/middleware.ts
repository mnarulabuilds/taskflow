import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_PAGES = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has('accessToken');

  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/workspaces') ||
    pathname.startsWith('/projects');

  if (isProtected && !hasToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (hasToken && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (hasToken && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
