"""Telegram bot (Tier 1): linking by own phone number, questions, voice, product codes, alerts — fake Telegram API."""

import json
from datetime import datetime, timedelta

import pytest

from backend import telegram_bot as tg
from tests.conftest import add_user

CHAT = 555


class FakeAPI:
    def __init__(self):
        self.sent = []          # (chat_id, text, reply_markup)
        self.files = {}

    def send(self, chat_id, text, reply_markup=None):
        self.sent.append((chat_id, text, reply_markup))

    def answer_callback(self, callback_id):
        pass

    def download(self, file_id):
        return self.files[file_id]


def msg(text=None, **extra):
    m = {"chat": {"id": CHAT, "type": "private"}, "from": {"id": 9001}, **extra}
    if text is not None:
        m["text"] = text
    return {"update_id": 1, "message": m}


@pytest.fixture
def bot(platform):
    tg.ensure_schema(platform)
    add_user(platform, 1, name="Abebe Kebede", phone="0944000001")
    add_user(platform, 2, role="agent", phone="0944000002")
    calls = {"ask": [], "voice": []}

    def ask(conn, user, question, lang, conversation_id=None):
        calls["ask"].append((user["id"], question, lang))
        calls.setdefault("conversations", []).append(conversation_id)
        return {"answer": "Apply urea after weeding [S1].", "conversation_id": 77,
                "sources": [{"ref": "S1", "citation": "MoA Wheat Package p. 16"}]}

    def transcribe(audio, mime, lang):
        calls["voice"].append((audio, mime, lang))
        if audio == b"silence":
            raise ValueError("no speech")
        return "Yuuriyaa yoom naquu qaba?"

    def verify(conn, code, user):
        return {"code": code, "result": "genuine", "reason": "ok", "product_name": "PLACEHOLDER_FUNGICIDE_A",
                "org_name": "PLACEHOLDER Supplier", "batch_number": "B-1", "placeholder": True}

    api = FakeAPI()
    b = tg.Bot(platform, api, ask_fn=ask, transcribe_fn=transcribe, verify_fn=verify)
    b.calls = calls
    return b


def _link(bot, lang="en"):
    bot.handle({"update_id": 1, "callback_query": {"id": "c", "data": f"lang:{lang}", "message": {"chat": {"id": CHAT}}}})
    bot.handle(msg(contact={"phone_number": "+251944000001", "user_id": 9001}))


def test_helpers():
    assert tg.local_phone("+251 944 000 001") == "0944000001" == tg.local_phone("944000001")
    assert tg.find_code("please check r8fg-798v-fz2y") == "R8FG-798V-FZ2Y"
    assert tg.find_code("http://x/verify?code=R8FG798VFZ2Y") == "R8FG-798V-FZ2Y"
    assert tg.find_code("When should I apply urea?") is None


def test_start_and_language(bot):
    bot.handle(msg("/start"))
    text, keyboard = bot.api.sent[-1][1], bot.api.sent[-1][2]
    assert "Agri-Stack 360" in text and len(keyboard["inline_keyboard"]) == 4
    bot.handle({"update_id": 2, "callback_query": {"id": "c", "data": "lang:om", "message": {"chat": {"id": CHAT}}}})
    assert bot.api.sent[-1][2]["keyboard"][0][0]["request_contact"] is True
    assert "qooduuf" in bot.api.sent[-1][1]                                   # asked in Afaan Oromoo


def test_linking_needs_own_registered_farmer_number(bot, platform):
    bot.handle(msg(contact={"phone_number": "+251944000001", "user_id": 1234}))   # someone else's contact
    assert bot.api.sent[-1][1] == tg.t("tg_own_number", "am")
    bot.handle(msg(contact={"phone_number": "+251911999999", "user_id": 9001}))
    assert bot.api.sent[-1][1] == tg.t("tg_not_registered", "am")
    bot.handle(msg(contact={"phone_number": "0944000002", "user_id": 9001}))      # an agent's number
    assert bot.api.sent[-1][1] == tg.t("tg_not_farmer", "am")
    _link(bot)
    assert "Abebe" in bot.api.sent[-1][1]
    assert platform.execute("SELECT user_id FROM telegram_links WHERE chat_id=?", (CHAT,)).fetchone()[0] == 1
    assert platform.execute("SELECT alert_channel FROM farmer_profiles WHERE user_id=1").fetchone()[0] == "telegram"


def test_questions_need_a_linked_account(bot):
    bot.handle(msg("How much urea?"))
    assert bot.api.sent[-1][1] == tg.t("tg_link_first", "am") and not bot.calls["ask"]
    _link(bot)
    bot.handle(msg("How much urea?"))
    assert bot.calls["ask"] == [(1, "How much urea?", "en")]
    reply = bot.api.sent[-1][1]
    assert reply.startswith("Apply urea after weeding") and "[S1] MoA Wheat Package p. 16" in reply
    bot.handle(msg("And how much?"))
    assert bot.calls["conversations"] == [None, 77]                       # the follow-up continues the conversation


def test_voice_note_is_transcribed_then_answered(bot):
    _link(bot, "om")
    bot.api.files["v1"] = b"ogg-bytes"
    bot.handle(msg(voice={"file_id": "v1", "mime_type": "audio/ogg"}))
    assert bot.calls["voice"] == [(b"ogg-bytes", "audio/ogg", "om")]
    assert "Yuuriyaa" in bot.api.sent[-2][1] and bot.calls["ask"][-1][1] == "Yuuriyaa yoom naquu qaba?"
    bot.api.files["v2"] = b"silence"
    bot.handle(msg(voice={"file_id": "v2", "mime_type": "audio/ogg"}))
    assert bot.api.sent[-1][1] == tg.t("tg_voice_failed", "om")


def test_product_code_works_without_linking(bot):
    bot.handle(msg("R8FG-798V-FZ2Y"))
    reply = bot.api.sent[-1][1]
    assert reply.startswith(tg.t("trust_genuine", "am")) and "PLACEHOLDER_FUNGICIDE_A" in reply
    assert tg.t("trust_placeholder", "am") in reply


def test_groups_are_ignored_and_errors_are_polite(bot):
    bot.handle({"update_id": 1, "message": {"chat": {"id": -1, "type": "group"}, "text": "/start"}})
    assert bot.api.sent == []
    _link(bot)
    bot.ask_fn = lambda *a: (_ for _ in ()).throw(RuntimeError("boom"))
    bot.handle(msg("question"))
    assert bot.api.sent[-1][1] == tg.t("tg_error", "en")


def test_alerts_after_linking_are_delivered_once(bot, platform):
    before = (datetime.now() - timedelta(days=1)).isoformat(sep=" ", timespec="seconds")
    platform.execute("INSERT INTO alerts (type, farmer_id, message_key, payload, status, created_at) VALUES "
                     "('neighborhood_disease', 1, 'outbreak_alert', ?, 'queued', ?)",
                     (json.dumps({"disease": "Yellow rust", "farms": 3, "radius": "10", "days": 14}), before))
    platform.commit()
    _link(bot)
    after = (datetime.now() + timedelta(seconds=1)).isoformat(sep=" ", timespec="seconds")
    platform.execute("INSERT INTO alerts (type, farmer_id, message_key, payload, status, created_at) VALUES "
                     "('neighborhood_disease', 1, 'outbreak_alert', ?, 'queued', ?)",
                     (json.dumps({"disease": "Leaf rust", "farms": 4, "radius": "10", "days": 14}), after))
    platform.commit()
    assert bot.deliver_alerts() == 1                                   # the one from before linking is not pushed
    assert "Leaf rust" in bot.api.sent[-1][1]
    assert bot.deliver_alerts() == 0
    assert platform.execute("SELECT status FROM alerts WHERE created_at=?", (after,)).fetchone()[0] == "sent"


def test_stop_unlinks(bot, platform):
    _link(bot)
    bot.handle(msg("/stop"))
    assert platform.execute("SELECT COUNT(*) FROM telegram_links").fetchone()[0] == 0
