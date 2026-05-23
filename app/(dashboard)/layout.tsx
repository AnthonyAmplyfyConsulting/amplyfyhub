import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
// Using plain img for logo
import { LogOut } from 'lucide-react'
import Navbar from '@/components/Navbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user initials for avatar
  const initials = user.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'U'

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/amplyfy-logo.png"
              alt="AMPLYFY"
              style={{ height: '36px', width: 'auto' }}
            />
          </div>

          <Navbar />

          <div className="topbar-actions">
            <div className="user-avatar" title={user.email || 'User'}>
              {initials}
            </div>
            <form action="/auth/signout" method="POST">
              <button type="submit" className="btn-logout" title="Sign out">
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        {children}
      </main>
    </>
  )
}
