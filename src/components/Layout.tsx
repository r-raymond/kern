import type { JSX } from 'solid-js'
import { SidebarTree } from './SidebarTree'
import { KernEditor, mode } from './KernEditor'
import { Inspector } from './Inspector'
import { StatusBar } from './StatusBar'

export function Layout(): JSX.Element {
  return (
    <div class="kern-layout">
      <aside class="kern-sidebar">
        <SidebarTree />
      </aside>

      <main class="kern-editor">
        <KernEditor />
      </main>

      <aside class="kern-inspector">
        <Inspector />
      </aside>

      <footer class="kern-statusbar">
        <StatusBar mode={mode()} />
      </footer>
    </div>
  )
}
