import { createSignal, For, type JSX } from 'solid-js'

interface TreeNode {
  id: string
  name: string
  type: 'folder' | 'page'
  children?: TreeNode[]
  expanded?: boolean
}

export function SidebarTree(): JSX.Element {
  const [tree, setTree] = createSignal<TreeNode[]>([
    {
      id: '1',
      name: 'Projects',
      type: 'folder',
      expanded: true,
      children: [
        { id: '1-1', name: 'Kern', type: 'page' },
        { id: '1-2', name: 'Ideas', type: 'page' },
      ]
    },
    {
      id: '2',
      name: 'Notes',
      type: 'folder',
      expanded: false,
      children: [
        { id: '2-1', name: 'Daily', type: 'page' },
        { id: '2-2', name: 'Archive', type: 'folder', children: [] },
      ]
    },
    { id: '3', name: 'Quick Notes', type: 'page' },
  ])

  const [activeId, setActiveId] = createSignal<string>('1-1')

  const renderNode = (node: TreeNode, depth: number, isLast: boolean, parentPrefix: string): JSX.Element => {
    const branch = isLast ? '└── ' : '├── '
    const prefix = parentPrefix + (isLast ? '    ' : '│   ')
    const icon = node.type === 'folder' ? (node.expanded ? '▾ ' : '▸ ') : '  '

    const toggleExpand = () => {
      if (node.type === 'folder') {
        setTree(t => updateNode(t, node.id, { expanded: !node.expanded }))
      }
      setActiveId(node.id)
    }

    return (
      <>
        <div
          class={`tree-item ${activeId() === node.id ? 'active' : ''}`}
          onClick={toggleExpand}
        >
          <span class="tree-branch">{depth > 0 ? parentPrefix + branch : ''}</span>
          <span class="tree-icon">{icon}</span>
          {node.name}
        </div>
        {node.type === 'folder' && node.expanded && node.children && (
          <For each={node.children}>
            {(child, index) => renderNode(
              child,
              depth + 1,
              index() === node.children!.length - 1,
              depth > 0 ? prefix : ''
            )}
          </For>
        )}
      </>
    )
  }

  const updateNode = (nodes: TreeNode[], id: string, updates: Partial<TreeNode>): TreeNode[] => {
    return nodes.map(node => {
      if (node.id === id) {
        return { ...node, ...updates }
      }
      if (node.children) {
        return { ...node, children: updateNode(node.children, id, updates) }
      }
      return node
    })
  }

  return (
    <div class="sidebar-tree">
      <div class="section-header">Pages</div>
      <For each={tree()}>
        {(node, index) => renderNode(node, 0, index() === tree().length - 1, '')}
      </For>
    </div>
  )
}
