'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  KeyRound,
  Coins,
  Users,
  ScrollText,
  ShieldCheck,
  FolderTree,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Secrets', href: '/secrets', icon: KeyRound },
  { label: 'Tokens', href: '/tokens', icon: Coins },
  { label: 'Users', href: '/users', icon: Users, adminOnly: true },
  { label: 'Audit', href: '/audit', icon: ScrollText, adminOnly: true },
  { label: 'Policies', href: '/policies', icon: ShieldCheck, adminOnly: true },
  { label: 'Namespaces', href: '/namespaces', icon: FolderTree, adminOnly: true },
];

function AppSidebarContent() {
  const pathname = usePathname();
  const { username, logout, isAdmin } = useAuth();
  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <KeyRound className="size-5" />
          <span>Vibr8Vault</span>
        </Link>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <Separator />
      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground truncate">
            {username ?? 'Unknown'}
          </span>
          <Button variant="ghost" size="icon" onClick={logout} title="Logout">
            <LogOut className="size-4" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppSidebar({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebarContent />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 p-2 md:hidden">
          <SidebarTrigger />
        </div>
        {children}
      </main>
    </SidebarProvider>
  );
}
