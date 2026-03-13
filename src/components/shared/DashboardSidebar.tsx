'use client';

import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import AppLogo from './AppLogo';
import { usePathname, useRouter } from 'next/navigation';
import { Home, List, LogOut, PiggyBank, Settings } from 'lucide-react';
import { useAuth, useUser } from '@/firebase/provider';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Separator } from '../ui/separator';

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar');

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      router.push('/');
      toast({
        title: 'Signed Out',
        description: 'You have been successfully signed out.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error signing out',
        description: 'There was a problem signing you out. Please try again.',
      });
    }
  };

  const navItems = [
    { label: 'Dashboard', icon: Home, href: '/dashboard' },
    { label: 'Records', icon: List, href: '/dashboard/records' },
    { label: 'Savings Plan', icon: PiggyBank, href: '/dashboard/savings' },
  ];

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border/50 py-4">
        <div className="flex items-center gap-3 px-2">
            <div className="p-1.5 bg-primary/10 rounded-lg shadow-sm">
              <AppLogo className="h-6 w-6 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Data Keeper
            </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-3">
        <SidebarMenu className="space-y-1">
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={pathname === item.href}
                onClick={() => router.push(item.href)}
                tooltip={item.label}
                className="transition-all duration-200"
              >
                <item.icon className={pathname === item.href ? "text-primary" : ""} />
                <span className="font-medium">{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-3 space-y-3">
         <Separator className="bg-sidebar-border/50" />
         <div className="flex items-center gap-3 px-2 group-data-[collapsible=icon]:justify-center">
            <Avatar className="h-8 w-8 border-2 border-primary/20">
              <AvatarImage src={userAvatar?.imageUrl} alt={user?.displayName ?? 'User'} data-ai-hint={userAvatar?.imageHint} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                {user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold text-sidebar-foreground">
                  {user?.displayName ?? 'Account User'}
                </span>
                <span className="truncate text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  {user?.email}
                </span>
            </div>
         </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleSignOut} 
              tooltip="Sign Out"
              className="hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="font-medium">Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
