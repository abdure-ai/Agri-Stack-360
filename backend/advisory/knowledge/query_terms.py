"""
query_terms.py — Amharic search words for questions asked in English, Afaan Oromoo or Tigrinya.

The Ministry manuals in the knowledge base are written in Amharic. An English question ("How often should I
irrigate wheat at tillering?") shares almost no words with them, so the keyword search found the wrong pages
(the few English words in the manuals, like "(Booting stage)"). Before searching, the Amharic words for the
farming terms in the question are added. A fixed word list: no AI call, so no extra cost or delay.
"""

from __future__ import annotations

import re

# term stems in en / om / ti  ->  Amharic words used in the MoA manuals
GLOSSARY: list[tuple[tuple[str, ...], str]] = [
    (("irrigat", "watering", "water the", "bishaan obaas", "obaasuu", "jallisii", "ማይ ምሃብ", "ምስታይ", "ምስኖ"),
     "መስኖ ውሃ ማጠጣት የውሃ አሰጣጥ"),
    (("tiller", "dhaloota", "ምውላድ"), "መዋለድ ቅጥያ"),
    (("urea", "yuuriyaa", "ዩርያ"), "ዩሪያ ዩርያ"),
    (("nps", "dap"), "ኤን.ፒ.ኤስ"),
    (("fertili", "xaa'oo", "xa'oo", "ማዳበርያ"), "ማዳበሪያ"),
    (("weed", "aramaa", "ኣረም"), "አረም"),
    (("rust", "dhukkuba", "disease", "ሕማም"), "በሽታ ዋግ"),
    (("yellow rust", "stripe rust"), "ቢጫ ዋግ"),
    (("leaf rust", "brown rust"), "የቅጠል ዋግ"),
    (("stem rust",), "የግንድ ዋግ"),
    (("septoria",), "ሴፕቶሪያ"),
    (("smut",), "አረማሞ"),
    (("seed rate", "seeding rate", "how much seed"), "የዘር መጠን በሄክታር"),
    (("seed", "sanyii", "ዘርኢ"), "ዘር"),
    (("variet", "gosa", "ዓይነት"), "ዝርያ"),
    (("sow", "plant", "facaas", "dhaab", "ዝርኣት", "ምዝራእ"), "መዝራት ዘር"),
    (("harvest", "sassaab", "ምእካብ", "ምዕጻድ"), "ምርት አሰባሰብ ማጨድ"),
    (("stor", "kuusaa", "ምዕቃብ"), "ማከማቻ ጎተራ"),
    (("pest", "insect", "aphid", "ilbiis", "ባልዕ", "ተባዒ"), "ተባይ"),
    (("soil", "biyyoo", "ሓመድ"), "አፈር"),
    (("spray", "fungicid", "pesticid", "chemical", "keemikaal", "ኬሚካል"), "ፀረ-በሽታ ኬሚካል መርጨት"),
    (("land prep", "plough", "plow", "qotiinsa", "ምሕራስ"), "የማሳ ዝግጅት እርሻ"),
    (("yield", "oomisha", "ፍርያት"), "ምርት ምርታማነት"),
    (("heading", "flower", "booting", "ዕምባባ"), "አባባ ማዘርዘር"),
    (("matur", "bilchaa", "ብስለት"), "ብስለት"),
    (("drain", "waterlog"), "ፍሳሽ ውሃ መቋጠር"),
    (("canal", "furrow", "boyii"), "ቦይ"),
]
_ETHIOPIC = re.compile(r"[ሀ-᎟]")


def expand(question: str, lang: str | None) -> str:
    """The question plus the Amharic words for the farming terms it uses (unchanged for Amharic questions)."""
    if lang == "am":
        return question
    text = question.lower()
    extra = [am for terms, am in GLOSSARY if any((t in text) if _ETHIOPIC.search(t) else
                                                re.search(rf"\b{re.escape(t)}", text) for t in terms)]
    return question if not extra else f"{question} {' '.join(dict.fromkeys(extra))}"
