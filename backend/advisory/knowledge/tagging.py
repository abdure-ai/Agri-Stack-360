"""
tagging.py — Topic and crop-stage tags for chunks (Amharic + English keywords).

Topics follow the spec (§F1): planting, fertilizer, weeding, disease, pest,
harvest, post_harvest, storage, plus variety, land_preparation, irrigation,
soil. Keyword tagging is a first pass to filter and boost search; it is not
used to decide advice. Extend the lists here (or move them to a table) as
new crops and documents are added.
"""

from __future__ import annotations

TOPIC_KEYWORDS: dict[str, list[str]] = {
    "fertilizer": ["ማዳበሪያ", "መዳበሪያ", "መዳበርያ", "ማዳበርያ", "ዩሪያ", "ዩርያ", "ዳፕ", "ኤንፒኤስ", "ኤን ፒ ኤስ", "ኮምፖስት",
                   "ኖራ", "urea", "nps", "dap", "fertilizer", "fertiliser", "compost", "lime", "nitrogen", "xaa'oo"],
    "weeding": ["አረም", "weed", "herbicide", "ፀረ-አረም", "ጸረ አረም", "aramaa"],
    "disease": ["በሽታ", "ዋግ", "ሻጋታ", "ቅጠል ዋግ", "ቢጫ ዋግ", "ግንድ ዋግ", "rust", "septoria", "mildew", "blight",
                "fungicide", "ፀረ-ፈንገስ", "ፈንገስ", "disease", "dhukkuba"],
    "pest": ["ተባይ", "ፀረ-ተባይ", "ቅማል", "ትል", "aphid", "pest", "insect", "insecticide", "ilbiisa"],
    "planting": ["ዘር ወቅት", "የዘር ወቅት", "አዘራር", "መዝራት", "የዘር መጠን", "ዘር መጠን", "sowing", "seed rate", "planting",
                 "facaasuu"],
    "variety": ["ዝርያ", "variety", "varieties", "cultivar", "gosa"],
    "land_preparation": ["ማሳ ዝግጅት", "ማረስ", "እርሻ", "tillage", "land preparation", "plough", "plow"],
    "irrigation": ["መስኖ", "ውሃ", "irrigation", "irrigated", "bishaan", "jallisii"],
    "soil": ["አፈር", "ኮትቻ", "soil", "vertisol", "acidic", "lafa"],
    "harvest": ["አጨዳ", "ውቂያ", "ምርት አሰባሰብ", "harvest", "threshing", "midhaan sassaabuu"],
    "post_harvest": ["ድህረ ምርት", "ድህረ-ምርት", "post-harvest", "postharvest"],
    "storage": ["ክምችት", "ማከማቻ", "ማከማቸት", "storage", "store", "kuusaa"],
}

# Crop stage implied by a topic (heuristic, for filtering only).
TOPIC_STAGE = {
    "land_preparation": "pre_planting",
    "planting": "planting",
    "variety": "pre_planting",
    "fertilizer": "vegetative",
    "weeding": "vegetative",
    "irrigation": "vegetative",
    "disease": "vegetative_to_heading",
    "pest": "vegetative_to_heading",
    "harvest": "maturity",
    "post_harvest": "post_harvest",
    "storage": "post_harvest",
}


def topic_scores(text: str) -> dict[str, int]:
    t = text.lower()
    return {topic: sum(t.count(k.lower()) for k in words) for topic, words in TOPIC_KEYWORDS.items()}


def tag(text: str, section: str = "") -> tuple[str, str | None]:
    """(primary topic, crop stage). Section headings count double."""
    scores = topic_scores(text)
    for topic, n in topic_scores(section).items():
        scores[topic] += 2 * n
    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return "general", None
    return best, TOPIC_STAGE.get(best)
