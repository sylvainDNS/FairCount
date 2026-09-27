# Specification Quality Checklist: Dépenses récurrentes

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-27
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Iteration 1 : 2 marqueurs [NEEDS CLARIFICATION] (visualisation dans la liste, date de début passée).
- Iteration 2 (2026-09-27) : marqueurs résolus (Q1 → section repliable « Récurrentes actives »,
  Q2 → date de début passée interdite) + précision sur les droits (tout·e membre modifie toute
  récurrence). Tous les items passent.
- Iteration 3 (2026-09-27, après shape) : vocabulaire fixé (récurrence / échéance / dépense
  générée, « occurrence » abandonné), date de fin retirée, désactiver/réactiver et supprimer
  séparés (FR-024 à FR-026). Tous les items passent toujours.
- Iteration 4 (2026-09-27) : réactivation confirmée ; après suppression d'une récurrence, ses
  dépenses gardent l'indicateur (récurrence conservée en historique). Brief confirmé.
