# pi-immediate-compaction

[![npm version](https://img.shields.io/npm/v/pi-immediate-compaction.svg)](https://www.npmjs.com/package/pi-immediate-compaction) [![license](https://img.shields.io/npm/l/pi-immediate-compaction.svg)](https://github.com/buihongduc132/pi-immediate-compaction/blob/main/LICENSE) [![pi-package](https://img.shields.io/badge/pi-package-blue)](https://github.com/buihongduc132/pi-immediate-compaction)

Proactive context window management for [Pi CLI agent](https://github.com/nicobailon/pi). Monitors context window usage in real-time and triggers compaction **before** the auto-compaction threshold — preserving critical context like active code changes, pending tasks, and next actions.

## Features

- **Immediate compaction** — Triggers compaction slightly before Pi's built-in auto-compact, with custom instructions to preserve essential context
- **Overflow protection** — Hard stop at 100% context usage with minimal context preservation
- **Configurable thresholds** — Offset from auto-compact, custom instructions, post-compact prompts
- **Multiple engine support** — Auto-detect or use external compaction tools (e.g., pi-vcc)
- **Cooldown management** — Prevents compaction thrashing with configurable cooldown windows
- **Usage tracking** — Records context usage snapshots for threshold evaluation

## Installation

### For humans

```bash
npm install pi-immediate-compaction
```

### For AI agents (Pi settings.json)

```json
{
  "packages": [
    "pi-immediate-compaction"
  ]
}
```

### Git-sourced

```json
{
  "packages": [
    "https://github.com/buihongduc132/pi-immediate-compaction"
  ]
}
```

Or local path:

```json
{
  "packages": [
    "/path/to/pi-immediate-compaction"
  ]
}
```

## Usage

The extension hooks into Pi's `message_end` / `turn_end` lifecycle events. It evaluates context window usage after each assistant turn and triggers compaction when thresholds are crossed.

No manual invocation needed — the extension activates automatically when loaded as a Pi package.

## Configuration

Create an `immediate-compaction.json` in your project or global config (`~/.pi/immediate-compaction.json`):

```json
{
  "enabled": true,
  "triggerMode": "arm-during-streaming",
  "cooldown": {
    "minMsBetweenCompactions": 15000,
    "requirePercentIncreaseBeforeRetrigger": 1
  },
  "immediate": {
    "enabled": true,
    "offsetPercentFromAuto": 1,
    "customInstructions": "Preserve active code changes, pending tasks, and exact next actions.",
    "postCompactPrompt": "Continue immediately from the compacted state.",
    "deliverAs": "followUp",
    "triggerTurn": true
  },
  "overflow": {
    "enabled": true,
    "percent": 100,
    "customInstructions": "Preserve only critical continuation context.",
    "postCompactPrompt": "Context overflow. Continue with strict brevity.",
    "deliverAs": "followUp",
    "triggerTurn": true
  },
  "engine": {
    "kind": "auto",
    "command": null
  }
}
```

See `immediate-compaction.example.json` for full options.

### Engine Options

| `engine.kind` | Behavior |
|---|---|
| `"auto"` | Auto-detect: uses VCC if available, falls back to core |
| `"vcc"` | Always use pi-vcc adapter |
| `"core"` | Always use built-in core engine |
| `"command"` | Use external command via `engine.command` |
| `"custom"` | Load custom engine from `engine.custom.path` |

## Architecture

```
index.ts              — Public API exports
config.ts             — Config loading, threshold calculation
coordinator.ts        — Core compaction orchestration
delivery-policy.ts    — Post-compaction prompt delivery
state.ts              — Coordinator state management
usage-cache.ts        — Context usage snapshot tracking
thresholds/
  immediate.ts        — Immediate (pre-auto) threshold
  overflow.ts         — Overflow (hard limit) threshold
  registry.ts         — Threshold registry
engine/
  resolver.ts         — Engine selection (auto/command)
  core-engine.ts      — Built-in compaction engine
  command-engine.ts   — External command engine
  adapters/pi-vcc.ts  — Pi-VCC adapter
types.ts              — Shared type definitions
```

## Development

```bash
npm install
npm run typecheck
npm test
```

## License

MIT © 2025 buihongduc132

## Repository

[github.com/buihongduc132/pi-immediate-compaction](https://github.com/buihongduc132/pi-immediate-compaction)
