import type { ActivityItem } from '@/lib/mock-data'

interface ActivityFeedProps {
  items: ActivityItem[]
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div className="chart-card animate-in" style={{ animationDelay: '360ms' }}>
      <div className="chart-title">Recent Activity</div>
      <div className="activity-list">
        {items.map((item) => (
          <div key={item.id} className="activity-item">
            <div className="activity-icon">{item.icon}</div>
            <div className="activity-content">
              <div className="activity-title">{item.title}</div>
              <div className="activity-desc">{item.description}</div>
            </div>
            <div className="activity-time">{item.time}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
