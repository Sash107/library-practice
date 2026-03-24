#!/bin/bash

# Auto-restart the Next.js dev server if it crashes (e.g. after npm install)
while true; do
  echo "Starting Next.js dev server..."
  cd /home/user/myapp && npx next dev --turbopack --port 3000
  echo "Dev server exited, restarting in 2s..."
  sleep 2
done