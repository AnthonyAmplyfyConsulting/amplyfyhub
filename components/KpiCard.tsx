import type { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface KpiCardProps {
  icon: ReactNode
  label: string
  value: string
  change?: number
  subtext?: string
  delay?: number
}

export default function KpiCard({ icon, label, value, change, subtext, delay = 0 }: KpiCardProps) {
  const isPositive = change !== undefined && change >= 0

  return (
    <div
      className="kpi-card animate-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="kpi-header">
        <div className="kpi-icon">{icon}</div>
        {change !== undefined && (
          <span className={`kpi-change ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isPositive ? '+' : ''}
            {change}%
          </span>
        )}
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {subtext && (
        <div className="kpi-subtext" dangerouslySetInnerHTML={{ __html: subtext }} />
      )}
    </div>
  )
}
