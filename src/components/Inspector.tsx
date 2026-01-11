import type { JSX } from 'solid-js'

interface PropertyRow {
  label: string
  value: string
}

export function Inspector(): JSX.Element {
  const properties: PropertyRow[] = [
    { label: 'Created', value: '2024-01-15' },
    { label: 'Modified', value: '2024-01-15' },
    { label: 'Words', value: '42' },
    { label: 'Characters', value: '256' },
  ]

  const tags = ['kern', 'project', 'local-first']

  return (
    <div class="inspector-content">
      <div class="section-header">Properties</div>
      <div class="property-list">
        {properties.map(prop => (
          <div class="property-row">
            <span class="property-label">{prop.label}</span>
            <span class="property-value">{prop.value}</span>
          </div>
        ))}
      </div>

      <div class="section-header" style={{ "margin-top": "1lh" }}>Tags</div>
      <div class="tag-list">
        {tags.map(tag => (
          <span class="tag">#{tag}</span>
        ))}
      </div>

      <div class="section-header" style={{ "margin-top": "1lh" }}>Backlinks</div>
      <div class="backlink-list">
        <div class="backlink-item">
          <span class="tree-branch">└── </span>
          Ideas.md
        </div>
      </div>
    </div>
  )
}
