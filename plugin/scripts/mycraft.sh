#!/usr/bin/env bash
# Starts, stops and updates a local Mycraft dashboard for the Claude Code plugin.
# Usage: mycraft.sh [start|demo|stop|status|update]
set -euo pipefail

REPO_URL="${MYCRAFT_REPO:-https://github.com/JulianWangHZ/Mycraft.git}"
HOME_DIR="${CLAUDE_PLUGIN_DATA:-$HOME/.mycraft/plugin}"
APP="$HOME_DIR/app"
RUN="$HOME_DIR/run"
PORT="${MYCRAFT_PORT:-4777}"
URL="http://127.0.0.1:$PORT"

say() { printf '%s\n' "$*"; }
fail() { printf 'Error: %s\n' "$*" >&2; exit 1; }

open_url() {
  if command -v open >/dev/null 2>&1; then open "$1"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$1" >/dev/null 2>&1
  else say "Open this in your browser: $1"
  fi
}

running() { curl -fsS -o /dev/null --max-time 1 "$URL/api/health" 2>/dev/null; }

check_tools() {
  command -v git >/dev/null 2>&1 || fail "git is needed to fetch Mycraft."
  command -v node >/dev/null 2>&1 || fail "Node 22 or newer is needed (https://nodejs.org)."
  local major
  major="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$major" -ge 22 ] || fail "Node 22 or newer is needed; this machine has $(node --version)."
  command -v pnpm >/dev/null 2>&1 || fail "pnpm is needed: run 'npm install -g pnpm', then try again."
}

# Fetch the app on first use, then install and build whenever the checkout has moved on.
prepare() {
  mkdir -p "$HOME_DIR" "$RUN"
  if [ ! -d "$APP/.git" ]; then
    say "Fetching Mycraft (first run only)..."
    git clone --quiet --depth 1 "$REPO_URL" "$APP"
  fi
  local rev built=""
  rev="$(git -C "$APP" rev-parse HEAD)"
  [ -f "$RUN/built-rev" ] && built="$(cat "$RUN/built-rev")"
  if [ "$rev" != "$built" ] || [ ! -d "$APP/apps/web/dist" ]; then
    say "Installing and building (about a minute the first time)..."
    local log="$RUN/build.log"
    if ! (cd "$APP" && pnpm install --frozen-lockfile && pnpm build) > "$log" 2>&1; then
      tail -n 15 "$log" >&2
      fail "Installing or building failed. The full log is at $log"
    fi
    printf '%s' "$rev" > "$RUN/built-rev"
  fi
}

start() {
  local mode="${1:-}"
  if running; then
    say "Mycraft is already running at $URL"
    open_url "$URL"
    say "If the page asks you to sign in, run '/mycraft:open restart' for a fresh link."
    return
  fi
  check_tools
  prepare
  local log="$RUN/server.log"
  : > "$log"
  # Detached from this shell so the dashboard keeps running after the command returns.
  (cd "$APP" && nohup pnpm start --port "$PORT" $mode > "$log" 2>&1 < /dev/null & echo $! > "$RUN/server.pid")
  local link=""
  for _ in $(seq 1 60); do
    link="$(grep -Eo "$URL/api/auth\?token=[A-Za-z0-9_-]+" "$log" | head -n 1 || true)"
    [ -n "$link" ] && running && break
    sleep 0.5
  done
  [ -n "$link" ] || fail "The server didn't start. Its log is at $log"
  say "Mycraft is running at $URL${mode:+ (demo data)}"
  open_url "$link"
  say "Opened the one-time sign-in link in your browser."
}

stop() {
  local stopped=no
  if [ -f "$RUN/server.pid" ]; then
    local pid
    pid="$(cat "$RUN/server.pid")"
    # pnpm starts the server as a child, so stop the whole group it leads.
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null && stopped=yes || true
    rm -f "$RUN/server.pid"
  fi
  local port_pid
  port_pid="$(lsof -ti "tcp:$PORT" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$port_pid" ]; then kill $port_pid 2>/dev/null && stopped=yes || true; fi
  [ "$stopped" = yes ] && say "Stopped Mycraft." || say "Mycraft wasn't running."
}

status() {
  if running; then say "Running at $URL"; else say "Not running."; fi
  [ -d "$APP/.git" ] && say "Version: $(git -C "$APP" log -1 --format='%h %s')"
  return 0
}

update() {
  [ -d "$APP/.git" ] || { say "Not installed yet; it will be fetched on first start."; return; }
  check_tools
  say "Updating Mycraft..."
  git -C "$APP" pull --quiet --ff-only
  local was_running=no
  running && was_running=yes && stop
  prepare
  say "Updated to $(git -C "$APP" log -1 --format='%h %s')"
  [ "$was_running" = yes ] && start
  return 0
}

case "${1:-start}" in
  start|open|"") start ;;
  demo) start --demo ;;
  restart) stop; start ;;
  stop) stop ;;
  status) status ;;
  update) update ;;
  *) fail "Unknown command '$1'. Use start, demo, restart, stop, status or update." ;;
esac
