'use client';

import { useAuth } from '@/lib/auth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppSidebar } from '@/components/sidebar';
import { SealBanner } from '@/components/seal-banner';

const ADMIN_PATHS = ['/users', '/audit', '/policies', '/namespaces'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isAuthenticated, pathname, router]);

  // Redirect non-admin users away from admin-only pages
  useEffect(() => {
    if (isAuthenticated && !isAdmin && ADMIN_PATHS.some(p => pathname.startsWith(p))) {
      router.replace('/');
    }
  }, [isAuthenticated, isAdmin, pathname, router]);

  // Not authenticated and not on login page — show nothing while redirecting
  if (!isAuthenticated && pathname !== '/login') {
    return null;
  }

  // Non-admin on admin page — show nothing while redirecting
  if (isAuthenticated && !isAdmin && ADMIN_PATHS.some(p => pathname.startsWith(p))) {
    return null;
  }

  // Login page gets no sidebar chrome
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Authenticated route — render sidebar layout
  return (
    <div className="flex h-screen">
      <AppSidebar>
        <SealBanner />
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </AppSidebar>
    </div>
  );
}
