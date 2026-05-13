# pi-immediate-compaction

Proactive context window management for [Pi](https://github.com/nicobailon/pi) CLI agent.

Monitors context window usage in real-time and triggers compaction **before** the auto-compaction threshold — preserving critical context like active code changes, pending tasks, and next actions.

## Features

- **Immediate compaction**: Triggers compaction slightly before Pi's built-in auto-compact, with custom instructions to preserve essential context
- **Overflow protection**: Hard stop at 100% context usage with minimal context preservation
- **Configurable thresholds**: Offset from auto-compact, custom instructions, post-compact prompts
- **Multiple engine support**: Auto-detect or use external compaction tools (e.g., pi-vcc)
- **Cooldown management**: Prevents compaction thrashing with configurable cooldown windows
- **Usage tracking**: Records context usage snapshots for threshold evaluation

## Install

Add to your Pi `settings.json` packages array:

```json
{
  "packages": [
    "https://github.com/buihongduc132/pi-immediate-compaction"
  ]
}
```

Or use as a local package:

```json
{
  "packages": [
    "/path/to/pi-immediate-compaction"
  ]
}
```

## Configuration

Create an `immediate-compaction.json` in your project or global config:

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
