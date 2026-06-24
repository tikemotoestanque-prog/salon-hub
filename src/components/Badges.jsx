import { STATUS_META, SOURCE_META } from '../data/sampleData.js'

export function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.new
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
