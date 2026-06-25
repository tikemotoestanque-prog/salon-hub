import { useStore } from '../store.jsx'
import { SOURCE_META, STATUS_META } from '../data/sampleData.js'

export function StatusBadge({ status }) {
  const { settings } = useStore()
  const statuses = settings?.statuses || STATUS_META
  const m = statuses[status] || statuses.new || { label: status, color: '#555', bg: '#eee', icon: '' }
  return (
    <span className="badge" style={{ background: m.bg, color: m.color }}>
      <span aria-hidden>{m.icon}</span>
      {m.label}
    </span>
  )
}

export function SourceBadge({ source }) {
  const m = SOURCE_META[source] || SOURCE_META.hotpepper
  return (
    <span className="badge" style={{ background: m.bg, color: m.color }}>
      <span className="dot" style={{ background: m.color }} />
      {m.label}
    </span>
  )
}
