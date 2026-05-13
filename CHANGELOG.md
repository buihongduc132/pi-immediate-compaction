# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-05-13

### Added
- Initial public release
- Immediate compaction threshold (triggers before auto-compact)
- Overflow protection threshold (hard stop at 100%)
- Configurable cooldown between compactions
- Multiple engine support (auto, command, pi-vcc adapter)
- Context usage snapshot tracking and caching
- Post-compaction prompt delivery with configurable `deliverAs` mode
