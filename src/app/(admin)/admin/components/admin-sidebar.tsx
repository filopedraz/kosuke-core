'use client';

import * as React from 'react';
import { Activity, ArrowLeft, Database, MessageSquare, ScrollText } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';

import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  isActive?: boolean;
}

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === 'system' ? systemTheme : theme;

  const navItems: NavItem[] = React.useMemo(
    () => [
      {
        title: 'Projects',
        url: '/admin/projects',
        icon: Database,
        isActive: pathname?.startsWith('/admin/projects'),
      },
      {
        title: 'Chat Sessions',
        url: '/admin/chat-sessions',
        icon: MessageSquare,
        isActive: pathname?.startsWith('/admin/chat-sessions'),
      },
      {
        title: 'Logs',
        url: '/admin/logs',
        icon: ScrollText,
        isActive: pathname?.startsWith('/admin/logs'),
      },
      {
        title: 'Jobs',
        url: '/admin/jobs',
        icon: Activity,
        isActive: pathname?.startsWith('/admin/jobs'),
      },
    ],
    [pathname]
  );

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="relative h-8 w-8">
            <Image
              src={currentTheme === 'dark' ? '/logo-dark.svg' : '/logo.svg'}
              alt="Kosuke Logo"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Admin Panel</span>
            <span className="text-xs text-muted-foreground">System Management</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Back to Kosuke">
                <Link href="/">
                  <ArrowLeft />
                  <span>Back to Kosuke</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map(item => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title} isActive={item.isActive}>
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
