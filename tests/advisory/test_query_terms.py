"""Questions in English / Afaan Oromoo / Tigrinya get the Amharic farming words the manuals use."""

from backend.advisory.knowledge.query_terms import expand


def test_english_irrigation_question_gets_amharic_terms():
    q = expand("How often should I irrigate wheat at the tillering stage?", "en")
    assert "መስኖ" in q and "መዋለድ" in q and q.startswith("How often")


def test_oromo_and_specific_terms():
    assert "መስኖ" in expand("Qamadii yeroo meeqa booda bishaan obaasuu qaba?", "om")
    q = expand("How do I control yellow rust?", "en")
    assert "ቢጫ ዋግ" in q and "በሽታ ዋግ" in q


def test_amharic_questions_unchanged_and_no_false_matches():
    q = "ስንዴን በመዋለድ ደረጃ በስንት ቀን ልዩነት ማጠጣት አለብኝ?"
    assert expand(q, "am") == q
    assert expand("Hello, how are you?", "en") == "Hello, how are you?"
