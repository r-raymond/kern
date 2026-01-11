import type { JSX } from 'solid-js'

interface HelpOverlayProps {
  onClose: () => void
}

export function HelpOverlay(props: HelpOverlayProps): JSX.Element {
  return (
    <div class="help-overlay" onClick={props.onClose}>
      <div class="help-window" onClick={e => e.stopPropagation()}>
        <div class="help-header">
          <span>Kern Commands</span>
          <span class="help-close">? to close</span>
        </div>
        <div class="help-content">
          <div class="help-section">
            <h3>Normal Mode</h3>
            <div class="help-commands">
              <div><kbd>h/&#8592;</kbd> Move left</div>
              <div><kbd>j/&#8595;</kbd> Move down</div>
              <div><kbd>k/&#8593;</kbd> Move up</div>
              <div><kbd>l/&#8594;</kbd> Move right</div>
              <div><kbd>w</kbd> Next word</div>
              <div><kbd>0</kbd> Line start</div>
              <div><kbd>$</kbd> Line end</div>
              <div><kbd>g</kbd> File start</div>
              <div><kbd>G</kbd> File end</div>
              <div><kbd>i</kbd> Insert mode</div>
              <div><kbd>a</kbd> Append</div>
              <div><kbd>o</kbd> New line below</div>
              <div><kbd>O</kbd> New line above</div>
              <div><kbd>dw</kbd> Delete word</div>
              <div><kbd>dd</kbd> Delete line</div>
              <div><kbd>?</kbd> This help</div>
            </div>
          </div>
          <div class="help-section">
            <h3>Insert Mode</h3>
            <div class="help-commands">
              <div><kbd>Esc</kbd> Normal mode</div>
              <div><kbd>Enter</kbd> New line</div>
              <div><kbd>Bksp</kbd> Delete char</div>
              <div><kbd>Arrows</kbd> Move cursor</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
