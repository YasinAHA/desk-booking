# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [0.2.0] - 2026-02-07

### Added
- Desk reservation and cancellation via Supabase RPC functions
- Magic link authentication with session persistence
- Manual and automatic refresh of desk occupancy and user reservations
- Basic UI locking to prevent concurrent actions

### Changed
- Simplified action and refresh flow to avoid race conditions
- Centralized session rehydration using Supabase auth state
- Improved logging and debugging for fetch, auth, and refresh lifecycle

### Fixed
- UI freezes when switching browser tabs or applications
- Grid remaining locked after failed or interrupted actions
- Multiple overlapping refresh calls causing inconsistent state

### Known Issues
- Desk grid may not render in edge cases after auth until a manual refresh
- Further simplification of state handling is planned for next iteration

---

## [0.1.0] - 2026-01-01

### Added
- Initial desk reservation pilot
- Supabase project setup
- Basic UI layout and date selection
