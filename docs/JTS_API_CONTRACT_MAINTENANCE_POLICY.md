# JTS API contract maintenance policy (versioned docs)

**Date:** 2026-03-25  
**Applies to:** `docs/JTS_API_CONTRACT_V1_FRONTEND.md` and any future `v2` contract docs  
**Goal:** eliminate backend/frontend drift by making contract updates release-gated.

---

## 1) When to update the contract doc

Update the contract doc in the **same PR** whenever any of the following changes:

- any route path/method
- required/optional request fields
- response shape keys or nesting
- status enums or allowed values
- error codes or error message semantics
- authentication requirements or headers

If code changes but the contract doc does not, the PR is **not complete**.

---

## 2) Versioning rules (SemVer)

The contract doc uses **SemVer**.

- **PATCH** (`1.1.x`): examples, clarifications, non-breaking additions to documentation.
- **MINOR** (`1.x.0`): additive API changes (new optional fields, new endpoints), no breaking changes.
- **MAJOR** (`x.0.0`): breaking changes (route changes, required field changes, enum renames, removed fields).

Every version bump must include a **Changelog** entry.

---

## 3) Deprecations

If you keep old behavior for compatibility, you must document deprecation with:

- Deprecated: `<path/field>`
- Replacement: `<path/field>`
- First deprecated in: `vX.Y.Z`
- Removal target: `vA.B.C` (or date)
- Migration notes: what frontend must change

If there is **no removal target**, call it “compat permanently” explicitly.

---

## 4) Sample payload pack is release-gated

The contract doc’s sample payloads must be updated whenever:

- a field becomes required/optional
- enums change
- response shape changes

QA should validate at least one live call per sample in staging/QA.

---

## 5) Ownership

- **Backend owner:** ensures contract doc is updated and correct.
- **Frontend owner:** ensures mappers/tests align with contract version.
- **QA owner:** validates samples against an environment.

