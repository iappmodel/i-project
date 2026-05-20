# Full repo source recovery audit

**Status:** Blocked — GitHub org audit required before final source recovery is complete.

A systematic pass of all **iappmodel** GitHub repositories must finish before this document can hold the definitive source-of-truth matrix. Until then, treat integration state as **partial** per [`BRANCH_AND_SOURCE_INTEGRATION_AUDIT.md`](BRANCH_AND_SOURCE_INTEGRATION_AUDIT.md).

**Next step:** Execute [`GITHUB_REPO_RECOVERY_AUDIT_PLAN.md`](GITHUB_REPO_RECOVERY_AUDIT_PLAN.md) (clone → inspect → record). Do not merge or promote into `i_project_migration_archive` until audit results exist and §10 warnings in that plan are satisfied.

**Placeholder sections (to fill after GitHub audit):**

1. Org-wide source-of-truth table (repo × branch × system)
2. Gap list vs `integrations/` and `integrations/old-source-preservation/`
3. Promotion queue with explicit approve/deny per path

---

*Last updated: 2026-05-20 — placeholder created pending `GITHUB_REPO_RECOVERY_AUDIT_RESULTS.md`.*
