---
description: Opens the Mycraft dashboard, a local 3D view of every Claude Code and Codex session on this machine. Use when the user wants to see, open, start, stop or update Mycraft, the intern dashboard, or a view of what their agents are doing.
argument-hint: "[start | demo | restart | stop | status | update]"
allowed-tools: Bash(bash "${CLAUDE_PLUGIN_ROOT}/scripts/mycraft.sh":*)
---

Run the Mycraft launcher with the action the user asked for, and report what it printed.

Pick the action from the user's request, or from `$ARGUMENTS` when the skill is run as a command:

| User wants | Action |
|---|---|
| To open or see the dashboard (the default) | `start` |
| To try it without real sessions | `demo` |
| A fresh sign-in link, or the page asks to sign in | `restart` |
| To shut it down | `stop` |
| To check whether it is running | `status` |
| The latest version | `update` |

Run exactly this, with the action in place of `ACTION`:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/mycraft.sh" ACTION
```

The first start fetches and builds the app, which takes about a minute; tell the user that while it runs. The script opens the browser itself, so don't open URLs yourself.

If the script prints an `Error:` line, pass the message on as it is: it already says what to install or do next. Don't try to install Node, pnpm or git yourself.
