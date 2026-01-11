{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    rustup
    wasm-pack
    nodejs
  ];

  shellHook = ''
    echo "Kern Development Environment"
    echo "Rust: $(rustc --version 2>/dev/null || echo 'run: rustup default stable')"
    echo "wasm-pack: $(wasm-pack --version 2>/dev/null || echo 'available')"
    echo "Node: $(node --version)"
  '';
}
