# Project Assessment

## 1. Workspace Findings

**Project Root:** `D:\hopital managment`  
**Assessment Date:** 2026-10-11  
**Status:** Empty directory — no existing code, configuration, dependencies, or Git history.

This is a greenfield project. No existing work needs to be preserved or accounted for.

## 2. Development Environment

| Tool | Version | Status |
|------|---------|--------|
| Node.js | v24.15.0 | ✅ Available |
| npm | 11.12.1 | ✅ Available |
| npx | 11.12.1 | ✅ Available |
| Python | 3.13.14 | ✅ Available |
| pip | 26.2.1 | ✅ Available |
| Git | 2.54.0 | ✅ Available |
| PostgreSQL | — | ❌ Not installed |
| SQLite CLI | — | ❌ Not installed (but Python has sqlite3 built-in) |

**Operating System:** Windows (Windows 11 assumed from environment)

## 3. Key Constraints

1. **No PostgreSQL available.** Installing and configuring PostgreSQL on Windows adds significant setup friction for an academic project. SQLite will be used as the initial database — Python's built-in `sqlite3` module eliminates external dependencies. The schema will use standard SQL compatible with future PostgreSQL migration.

2. **No Docker or WSL available.** All development and execution must work natively on Windows with PowerShell.

3. **No paid services or API keys.** Authentication, notifications, payments, and all features must work locally without external dependencies.

4. **Academic context.** The system demonstrates hospital management concepts. It is not certified for clinical use. All patient data is synthetic.

## 4. Assumptions

1. The developer has a modern web browser (Chrome, Edge, or Firefox).
2. Python virtual environments (`venv`) are supported.
3. Disk space is sufficient for dependencies (~500MB estimated).
4. Port 5173 (Vite dev server) and port 8000 (API server) are available.
5. The folder name "hopital managment" is intentional and will not be renamed.
6. No other processes will compete for the SQLite database file during development.

## 5. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| SQLite lacks concurrent write support | Medium | Use WAL mode; serialize write operations; plan migration path to PostgreSQL |
| Large dependency download on slow network | Low | Lock dependency versions; use offline cache if needed |
| Python 3.13 compatibility with some packages | Low | Pin tested dependency versions; test early |
| Windows path length limits | Low | Keep directory nesting reasonable |

## 6. Decision: SQLite vs PostgreSQL

**Decision:** Use SQLite for the initial academic version.

**Rationale:**
- Zero installation friction — Python includes sqlite3 natively.
- Single-file database simplifies backup, reset, and demo distribution.
- Sufficient for an academic single-user demonstration system.
- The ORM (SQLAlchemy) abstracts SQL dialect differences, enabling future migration.

**Trade-offs:**
- No true concurrent write transactions (mitigated by WAL mode and serialized writes).
- No built-in network access (acceptable — single-machine academic system).
- Limited stored procedure support (not needed for this project).

**Migration path:** The schema uses standard SQL types. SQLAlchemy connection strings are the only configuration change needed for PostgreSQL. A `DATABASE_DESIGN.md` section documents the migration procedure.
