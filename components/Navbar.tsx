'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  DollarSign,
  GitBranch,
  Users,
  Network,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/revenue', label: 'Revenue & Expenses', icon: DollarSign },
  { href: '/pipeline', label: 'Pipeline', icon: GitBranch },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/mission-control', label: 'Mission Control', icon: Network },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="topbar-nav">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${isActive ? ' active' : ''}`}
            aria-label={item.label}
          >
            <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
            <span className="nav-tooltip">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
