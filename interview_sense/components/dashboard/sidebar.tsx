'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Zap,
  BarChart3,
  Clock,
  Settings,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard',       href: '/dashboard',     icon: LayoutDashboard },
  { label: 'Start Interview', href: '/interview/new', icon: Zap },
  { label: 'Reports',         href: '/reports',        icon: BarChart3 },
  { label: 'History',         href: '/history',        icon: Clock },
  { label: 'Settings',        href: '/settings',       icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 h-screen sticky top-0 border-r border-border/40 bg-card/20 backdrop-blur-sm flex flex-col animate-slide-in-left">
      <nav className="flex-1 space-y-1 p-3 pt-4">
        {navItems.map((item, i) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group',
                `animate-fade-up delay-${i * 75}`,
                isActive
                  ? 'bg-primary/15 text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-transform duration-200',
                  !isActive && 'group-hover:scale-110'
                )}
              />
              {item.label}
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 pb-5">
        <div className="rounded-lg border border-secondary/20 bg-secondary/8 p-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">Need help?</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Check our documentation and tutorials
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
