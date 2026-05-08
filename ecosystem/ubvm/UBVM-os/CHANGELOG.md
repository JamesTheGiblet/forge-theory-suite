# UBVM Changelog

## [Unreleased] - 2026-05-06

### Added
- Initialized CHANGELOG.md to track system evolution and bug fixes.

### Fixed
- Improved Gemini LLM JSON parsing in `mutate_strategy` primitive to gracefully handle conversational prefixes and irregular markdown fences, preventing silent fallback to random mutations.