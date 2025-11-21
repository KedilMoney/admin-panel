'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Users, 
  Building2, 
  FolderTree, 
  BarChart3, 
  LogOut,
  LayoutDashboard,
  FolderKanban,
  Image
} from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Bank Master', href: '/bank-master', icon: Building2 },
  { name: 'Groups', href: '/groups', icon: FolderKanban },
  { name: 'Categories', href: '/categories', icon: FolderTree },
  { name: 'Icons', href: '/icons', icon: Image },
  { name: 'Analysis', href: '/analysis', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    await authApi.logout();
    window.location.href = '/auth/login';
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r border-[var(--border)] bg-[var(--card)]">
      <div className="flex h-16 items-center justify-between border-b border-[var(--border)] px-6">
        <h1 className="text-xl font-bold text-[var(--foreground)]">Kedil Admin</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[var(--border)] p-4 space-y-2">
        <div className="flex items-center justify-center">
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );
}

