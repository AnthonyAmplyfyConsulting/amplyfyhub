import { DollarSign, TrendingUp, Users, Calendar, Mail } from 'lucide-react'
import KpiCard from '@/components/KpiCard'
import RevenueChart from '@/components/RevenueChart'
import ActivityFeed from '@/components/ActivityFeed'
import {
  getDashboardMetrics,
} from '@/lib/mock-data'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [metrics, { data: transactions }, { data: pipelineLeads }, { data: activityLogs }, { data: outreachContacts }] = await Promise.all([
    getDashboardMetrics(),
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user?.id)
      .order('date', { ascending: true }),
    supabase
      .from('pipeline_leads')
      .select('expected_value, created_at')
      .eq('user_id', user?.id),
    supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('outreach_contacts')
      .select('email_status, email_sent_at')
      .eq('user_id', user?.id)
      .in('email_status', ['sent', 'opened'])
  ])

  const totalExpectedValue = pipelineLeads?.reduce((sum, lead) => sum + (Number(lead.expected_value) || 0), 0) || 0

  // Calculate MTD Revenue
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const activeLeadsCount = pipelineLeads?.length || 0
  const leadsThisMonth = pipelineLeads?.filter(lead => new Date(lead.created_at) >= currentMonthStart).length || 0

  // Email Analytics Calculation
  const totalSent = outreachContacts?.length || 0
  const totalOpened = outreachContacts?.filter(c => c.email_status === 'opened').length || 0
  const realEmailOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0
  
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const emailsSentToday = outreachContacts?.filter(c => {
    if (!c.email_sent_at) return false
    return new Date(c.email_sent_at) >= todayStart
  }).length || 0

  let currentMtdRevenue = 0
  let lastMtdRevenue = 0

  const chartDataMap: Record<string, { revenue: number, expenses: number }> = {}

  // Initialize last 6 months in chart map
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthName = d.toLocaleString('default', { month: 'short' })
    chartDataMap[monthName] = { revenue: 0, expenses: 0 }
  }

  if (transactions) {
    transactions.forEach(t => {
      const txDate = new Date(t.date)
      const txMonthName = txDate.toLocaleString('default', { month: 'short' })

      // MTD Revenue Calculation
      if (t.type === 'revenue') {
        if (txDate >= currentMonthStart) currentMtdRevenue += t.amount
        if (txDate >= lastMonthStart && txDate < currentMonthStart) lastMtdRevenue += t.amount
      }

      // Chart Data Calculation
      if (chartDataMap[txMonthName]) {
        if (t.type === 'revenue') chartDataMap[txMonthName].revenue += t.amount
        if (t.type === 'expense') chartDataMap[txMonthName].expenses += t.amount
      }
    })
  }

  // Calculate Revenue Change %
  let revenueChange = 0
  if (lastMtdRevenue > 0) {
    revenueChange = ((currentMtdRevenue - lastMtdRevenue) / lastMtdRevenue) * 100
  } else if (currentMtdRevenue > 0) {
    revenueChange = 100 // 100% increase if last month was 0
  }

  const chartData = Object.entries(chartDataMap).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    expenses: data.expenses
  }))

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Welcome back. Here&apos;s your business at a glance.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          icon={<DollarSign size={20} />}
          label="Revenue (MTD)"
          value={`$${currentMtdRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          change={parseFloat(revenueChange.toFixed(1))}
          subtext="vs. last month"
          delay={0}
        />
        <KpiCard
          icon={<TrendingUp size={20} />}
          label="Expected Value"
          value={`$${totalExpectedValue.toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
          change={metrics.expectedValueChange}
          subtext="Pipeline total value"
          delay={60}
        />
        <KpiCard
          icon={<Users size={20} />}
          label="Active Leads"
          value={activeLeadsCount.toString()}
          change={metrics.leadsChange}
          subtext={`<strong>${leadsThisMonth}</strong> added this month`}
          delay={120}
        />
        <KpiCard
          icon={<Mail size={20} />}
          label="Emails Sent Today"
          value={emailsSentToday.toString()}
          change={0}
          subtext="Total emails sent today"
          delay={180}
        />
        <KpiCard
          icon={<Mail size={20} />}
          label="Email Open Rate"
          value={`${realEmailOpenRate}%`}
          change={0}
          subtext={`<strong>${totalOpened}</strong> opened / <strong>${totalSent}</strong> sent`}
          delay={240}
        />
      </div>

      {/* Charts & Activity */}
      <div className="charts-grid">
        <RevenueChart data={chartData} />
        <ActivityFeed items={(activityLogs || []).map(log => ({
          id: log.id,
          type: log.type as any,
          title: log.title,
          description: log.description,
          time: new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
          icon: log.icon
        }))} />
      </div>
    </>
  )
}
