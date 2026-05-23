// Mock data layer — async functions that mirror future Supabase queries
// Replace these with real database calls when backend is connected

export interface DashboardMetrics {
  expectedValue: number
  expectedValueChange: number
  leadsCount: number
  leadsChange: number
  upcomingMeetings: number
  nextMeeting: {
    title: string
    time: string
    attendee: string
  }
  emailOpenRate: number
  emailOpenRateChange: number
}

export interface RevenueDataPoint {
  month: string
  revenue: number
  expenses: number
}

export interface ActivityItem {
  id: string
  type: 'deal' | 'lead' | 'meeting' | 'email'
  title: string
  description: string
  time: string
  icon: string
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return {
    expectedValue: 128500,
    expectedValueChange: 8.3,
    leadsCount: 34,
    leadsChange: -2.1,
    upcomingMeetings: 8,
    nextMeeting: {
      title: 'Strategy Call — Vertex Corp',
      time: 'Today, 3:00 PM',
      attendee: 'Sarah Mitchell',
    },
    emailOpenRate: 42.3,
    emailOpenRateChange: 5.7,
  }
}



export async function getRecentActivity(): Promise<ActivityItem[]> {
  return [
    {
      id: '1',
      type: 'deal',
      title: 'Deal Closed — Horizon Tech',
      description: 'Consulting engagement worth $18,500 closed successfully',
      time: '2 hours ago',
      icon: '💰',
    },
    {
      id: '2',
      type: 'lead',
      title: 'New Lead — Marcus Zhao',
      description: 'Inbound inquiry from marcusz@novacorp.io regarding branding services',
      time: '4 hours ago',
      icon: '👤',
    },
    {
      id: '3',
      type: 'email',
      title: 'Campaign Sent — Q2 Newsletter',
      description: '1,240 recipients • 42.3% open rate • 12.1% click rate',
      time: 'Yesterday',
      icon: '📧',
    },
    {
      id: '4',
      type: 'meeting',
      title: 'Meeting Completed — Apex Industries',
      description: 'Discovery call with CFO regarding annual retainer proposal',
      time: 'Yesterday',
      icon: '📅',
    },
    {
      id: '5',
      type: 'deal',
      title: 'Proposal Sent — Luminar Group',
      description: 'Digital transformation proposal for $32,000 sent for review',
      time: '2 days ago',
      icon: '📄',
    },
  ]
}
