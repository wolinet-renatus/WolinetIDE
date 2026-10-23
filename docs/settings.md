# Settings

Settings in WolinetIDE provides unified configuration for workspace appearance, agent behavior, and Wolinet AI authentication.

## General
* **Appearance & Theme**: Clean dark theme (`#090d16`) with Wolinet Blue accents (`#0066f5`). Solid backgrounds replace distracting wallpaper covers for an uncluttered coding experience.
* **Text Size & Layout**: Zoom scaling, compact conversation options, and font adjustments. Preferences save automatically.
* **Quick Launcher**: Global shortcut (Command + Shift + Space on macOS, Control + Shift + Space on Windows/Linux) to bring up the quick agent overlay for prompt dispatch and running task monitoring.

## Wolinet AI Account & Providers
* **Wolinet AI Gateway**: Primary configuration for connecting to `https://lango.wolinet.com` (and `https://ai.wolinet.com`).
* **Authentication**:
  * One-click web login with Google or GitHub.
  * Direct API Key entry (`wolinet-sk-...`).
* **Status & Quota**: Live status indicator (latency, connection health) and current token usage / credit balance.
* **Model Selection**: Switch between **Wolinet Pro** (autonomous reasoning and agent swarms) and **Wolinet Coder** (fast code completions and edits).

## Agents & Turn Checks
* **Turn Checks**: Automatically runs fast test/check commands (such as `npm test` or `cargo check`) after a turn ends cleanly. When a check fails, an editable fix-it message is automatically queued for the agent.
* **Permissions & Approvals**: Granular controls over auto-approving terminal commands, file edits, and git worktrees.
