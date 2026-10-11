"""
priorities.py — Which farmers a Development Agent should visit first (DA Copilot).

Deterministic and explainable: fixed weights per reason, summed per farmer; ties go to the
farmer whose oldest open item has waited longest, then to the lower farmer id. No AI.

Reasons (weights are product choices, kept here in one place):
  worse                 the farmer said the crop got worse after our advice     100
  uncertain_diagnosis   photo check was unsure and no DA has verified it         60
  overdue_follow_up     follow-up date passed and the farmer has not answered    40
  outbreak_nearby       a disease outbreak alert went to this farmer recently    30
  open_question         an open escalated question (no answer in the manuals)    20
"""

from __future__ import annotations

from dataclasses import dataclass, field

WEIGHTS = {
    "worse": 100,
    "uncertain_diagnosis": 60,
    "overdue_follow_up": 40,
    "outbreak_nearby": 30,
    "open_question": 20,
}


@dataclass(frozen=True)
class Item:
    farmer_id: int
    reason: str            # a key of WEIGHTS
    since: str             # ISO timestamp the item started waiting
    ref_id: int | None = None   # escalation / diagnosis / alert id


@dataclass
class Visit:
    farmer_id: int
    score: int
    oldest: str
    reasons: list[dict] = field(default_factory=list)


def rank(items: list[Item]) -> list[Visit]:
    """One entry per farmer, highest score first; reasons listed by weight, then age."""
    by_farmer: dict[int, Visit] = {}
    for it in items:
        if it.reason not in WEIGHTS:
            raise ValueError(f"Unknown priority reason: {it.reason}")
        v = by_farmer.setdefault(it.farmer_id, Visit(it.farmer_id, 0, it.since))
        v.score += WEIGHTS[it.reason]
        v.oldest = min(v.oldest, it.since)
        v.reasons.append({"reason": it.reason, "weight": WEIGHTS[it.reason], "since": it.since, "ref_id": it.ref_id})
    for v in by_farmer.values():
        v.reasons.sort(key=lambda r: (-r["weight"], r["since"], r["ref_id"] or 0))
    return sorted(by_farmer.values(), key=lambda v: (-v.score, v.oldest, v.farmer_id))
