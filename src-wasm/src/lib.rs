use loro::LoroDoc;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

/// Initialize panic hook for better error messages in browser console
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Health check to verify WASM bridge is working
#[wasm_bindgen]
pub fn check_health() -> String {
    "Kern Engine: Active (Rust/WASM)".into()
}

/// Edit operation delta from JS
#[derive(Serialize, Deserialize, Debug)]
pub struct EditDelta {
    pub line: usize,
    pub col: usize,
    pub insert: Option<String>,
    pub delete: Option<usize>,
}

/// Line representation for view
#[derive(Serialize, Deserialize, Debug)]
pub struct LineView {
    pub id: String,
    pub content: String,
}

/// Document view snapshot
#[derive(Serialize, Deserialize, Debug)]
pub struct DocumentView {
    pub lines: Vec<LineView>,
    pub version: u64,
}

/// The main Kern Engine holding the Loro CRDT document
#[wasm_bindgen]
pub struct KernEngine {
    doc: LoroDoc,
    version: u64,
}

#[wasm_bindgen]
impl KernEngine {
    /// Create a new KernEngine with an empty document
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let doc = LoroDoc::new();

        // Initialize with a text container for the document content
        let text = doc.get_text("content");
        text.insert(0, "# Welcome to Kern\n\nStart typing...").unwrap();

        KernEngine { doc, version: 0 }
    }

    /// Apply an edit delta from the JS side
    #[wasm_bindgen]
    pub fn apply_edit(&mut self, delta: JsValue) -> Result<JsValue, JsValue> {
        let edit: EditDelta = serde_wasm_bindgen::from_value(delta)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        let text = self.doc.get_text("content");
        let content = text.to_string();

        // Calculate position from line/col
        let mut pos = 0;
        for (i, line) in content.lines().enumerate() {
            if i == edit.line {
                pos += edit.col.min(line.len());
                break;
            }
            pos += line.len() + 1; // +1 for newline
        }

        // Apply the edit
        if let Some(delete_count) = edit.delete {
            if delete_count > 0 && pos > 0 {
                text.delete(pos.saturating_sub(delete_count), delete_count).unwrap();
            }
        }

        if let Some(insert_text) = &edit.insert {
            text.insert(pos, insert_text).unwrap();
        }

        self.version += 1;

        // Return affected line indices for efficient re-render
        Ok(serde_wasm_bindgen::to_value(&vec![edit.line]).unwrap())
    }

    /// Get the current document view
    #[wasm_bindgen]
    pub fn get_view(&self) -> JsValue {
        let text = self.doc.get_text("content");
        let content = text.to_string();

        let lines: Vec<LineView> = content
            .lines()
            .enumerate()
            .map(|(i, line)| LineView {
                id: i.to_string(),
                content: line.to_string(),
            })
            .collect();

        let view = DocumentView {
            lines,
            version: self.version,
        };

        serde_wasm_bindgen::to_value(&view).unwrap()
    }

    /// Export full snapshot for periodic saves
    #[wasm_bindgen]
    pub fn export_snapshot(&self) -> Vec<u8> {
        self.doc.export(loro::ExportMode::Snapshot).unwrap()
    }

    /// Export only updates since last export (lightweight)
    #[wasm_bindgen]
    pub fn export_updates(&self) -> Vec<u8> {
        // For now, export full snapshot - can optimize with Loro's update tracking
        self.doc.export(loro::ExportMode::Snapshot).unwrap()
    }

    /// Load document from saved bytes
    #[wasm_bindgen]
    pub fn load_from_bytes(&mut self, data: &[u8]) -> Result<(), JsValue> {
        self.doc.import(data)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        self.version += 1;
        Ok(())
    }

    /// Get current version number
    #[wasm_bindgen]
    pub fn get_version(&self) -> u64 {
        self.version
    }

    /// Get document content as plain text
    #[wasm_bindgen]
    pub fn get_text(&self) -> String {
        self.doc.get_text("content").to_string()
    }

    /// Set entire document content (for initial load)
    #[wasm_bindgen]
    pub fn set_text(&mut self, content: &str) {
        let text = self.doc.get_text("content");
        let current = text.to_string();
        if !current.is_empty() {
            text.delete(0, current.len()).unwrap();
        }
        text.insert(0, content).unwrap();
        self.version += 1;
    }
}

impl Default for KernEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_check() {
        assert_eq!(check_health(), "Kern Engine: Active (Rust/WASM)");
    }

    #[test]
    fn test_engine_creation() {
        let engine = KernEngine::new();
        let content = engine.get_text();
        assert!(content.contains("Welcome to Kern"));
    }
}
