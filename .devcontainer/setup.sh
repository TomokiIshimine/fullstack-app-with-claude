#!/bin/bash
set -e

echo "==> Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y make

echo "==> Installing pnpm..."
npm install -g pnpm

echo "==> Installing Poetry..."
curl -sSL https://install.python-poetry.org | python3 -
export PATH="$HOME/.local/bin:$PATH"

echo "==> Setting up Google Cloud SDK..."
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
[ -f "$HOME/google-cloud-sdk/completion.zsh.inc" ] && source "$HOME/google-cloud-sdk/completion.zsh.inc"

echo "==> Installing project dependencies..."
make install

echo "==> Fixing file permissions..."
sudo chown -R vscode:vscode \
  /workspaces/full-stack-app-base2/frontend \
  /workspaces/full-stack-app-base2/backend \
  2>/dev/null || true

echo "==> Setup complete!"
