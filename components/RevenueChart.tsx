'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { RevenueDataPoint } from '@/lib/mock-data'

interface RevenueChartProps {
  data: RevenueDataPoint[]
}

function formatCurrency(value: number) {
  return `$${(value / 1000).toFixed(0)}k`
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    dataKey: string
    color: string
  }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: '#1A1A1A',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          border: 'none',
        }}
      >
        <p
          style={{
            color: '#9E9E9E',
            fontSize: '12px',
            marginBottom: '8px',
            fontWeight: 500,
          }}
        >
          {label}
        </p>
        {payload.map((entry, index) => (
          <p
            key={index}
            style={{
              color: entry.color,
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: index < payload.length - 1 ? '4px' : 0,
            }}
          >
            {entry.dataKey === 'revenue' ? 'Revenue' : 'Expenses'}:{' '}
            ${entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="chart-card animate-in" style={{ animationDelay: '300ms' }}>
      <div className="chart-title">Revenue vs Expenses</div>
      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#F5A623' }} />
          Revenue
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#E0E0E0' }} />
          Expenses
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F5A623" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#F5A623" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#BDBDBD" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#BDBDBD" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false} />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9E9E9E', fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9E9E9E', fontSize: 12 }}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="expenses"
            stroke="#BDBDBD"
            strokeWidth={2}
            fill="url(#expensesGradient)"
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#F5A623"
            strokeWidth={2.5}
            fill="url(#revenueGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
