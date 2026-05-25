# ADR-013: Entity Model — Elo & iAM

**Status:** Accepted (owner confirmed 2026-05-25)  
**Deciders:** Project owner  
**Blockers addressed:** ENT-01, ENT-05

---

## ENT-01 — Elo entity vs ELO UI mock

**Decision:** **Same product.** The Elo **entity** is canonical. The ELO UI mock in `i-initial-structures` (orb + panel shell) is an **implementation surface** of that entity — not a separate product or a ranking engine.

| Rejected | Accepted |
|----------|----------|
| ELO mock = unrelated demo | ELO mock = Stage 1 embodiment of Elo entity |
| "LO" as intelligence layer label | **Elo** as named companion entity |
| Inferring entity from mock code alone | Entity definition in `ENTITIES/ELO.md` + chats |

**Consequence:** Future Elo UI work extends the mock toward entity spec (rank 143 companion chat), not a fork.

---

## ENT-05 — Elo vs iAM

**Decision:** **Separate entities.**

| Entity | Layer | Focus |
|--------|-------|-------|
| **Elo** | Companion | Guidance, continuity, personalized assistant across platform |
| **iAM** | Identity OS | Self/future, emotional vault, simulations, routes — post-MVP module |

**Relationship:** Sibling layers — may share memory APIs later, but **not merged**.

```
iAM (who you are becoming)     Elo (companion who guides you)
         │                              │
         └────────── both feed ─────────┘
                    POP / Wallet / modules
```

**Consequence:** Do not collapse iAM features into Elo MVP. iAM stays deferred per constitution build order.

---

## References

- `ENTITIES/ELO.md`, `ENTITIES/iAM.md`
- `RELATIONSHIPS/Elo_POP.md`
- Supersedes partial guidance in ADR-012 (ELO ≠ ranking engine — still true; entity ownership now clarified)
