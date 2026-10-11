"""DA visit priority list: fixed weights, summed per farmer, deterministic tie-breaks."""

import random

import pytest

from backend.advisory.priorities import WEIGHTS, Item, rank


def test_weights_order_matches_urgency():
    order = sorted(WEIGHTS, key=WEIGHTS.get, reverse=True)
    assert order == ["worse", "uncertain_diagnosis", "overdue_follow_up", "outbreak_nearby", "open_question"]


def test_scores_are_summed_per_farmer_and_reasons_sorted():
    visits = rank([Item(1, "open_question", "2026-10-05", 7), Item(1, "worse", "2026-10-06", 8),
                   Item(2, "overdue_follow_up", "2026-10-01", 3)])
    assert [(v.farmer_id, v.score) for v in visits] == [(1, 120), (2, 40)]
    assert [r["reason"] for r in visits[0].reasons] == ["worse", "open_question"]
    assert visits[0].oldest == "2026-10-05"


def test_ties_go_to_the_longest_waiting_then_lowest_id():
    visits = rank([Item(3, "worse", "2026-10-05"), Item(2, "worse", "2026-10-02"), Item(1, "worse", "2026-10-05")])
    assert [v.farmer_id for v in visits] == [2, 1, 3]


def test_same_input_in_any_order_gives_same_result():
    items = [Item(i % 5, reason, f"2026-10-0{1 + i % 9}", i) for i, reason in enumerate(list(WEIGHTS) * 4)]
    expected = [(v.farmer_id, v.score, [r["ref_id"] for r in v.reasons]) for v in rank(items)]
    for seed in range(5):
        shuffled = items[:]
        random.Random(seed).shuffle(shuffled)
        assert [(v.farmer_id, v.score, [r["ref_id"] for r in v.reasons]) for v in rank(shuffled)] == expected


def test_unknown_reason_is_rejected():
    with pytest.raises(ValueError):
        rank([Item(1, "gut_feeling", "2026-10-01")])
