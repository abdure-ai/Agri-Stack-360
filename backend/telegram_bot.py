"""
telegram_bot.py — Agri-Stack 360 on Telegram (same core service as the web app).

    .venv/Scripts/python.exe -m backend.telegram_bot          # needs TELEGRAM_BOT_TOKEN in .env

What a farmer can do in the chat:
  * link the chat to their account by sharing the phone number they registered with (Telegram's
    "share contact" button; only the farmer's own contact is accepted);
  * ask a question as text or a voice note -> the same cited advisor as the app (channel 'telegram');
  * send a product code (or a scanned label link) -> Input Trust check;
  * receive their alerts (outbreak, follow-up, crop stage, rain, DA answers) in the chat;
  * /language, /help, /stop (unlink).
Photo checks stay in the app for now.

Long polling (getUpdates) with plain HTTPS calls, so it runs on any PC without a public address.
Telegram is a third party: questions and answers pass through it, like any Telegram message.
"""

from __future__ import annotations

import logging
import re
import sqlite3
import time
from datetime import datetime

import requests

from backend.advisory.config import env
from backend.advisory.i18n import t
from backend.advisory.providers import ProviderError

log = logging.getLogger("telegram_bot")

LANGS = {"am": "አማርኛ", "om": "Afaan Oromoo", "ti": "ትግርኛ", "en": "English"}
CODE_RE = re.compile(r"(?:code=)?\b([2-9A-HJ-NP-Z]{4})-?([2-9A-HJ-NP-Z]{4})-?([2-9A-HJ-NP-Z]{4})\b", re.I)
MAX_MESSAGE = 4000          # Telegram's limit is 4096 characters

SCHEMA = """
CREATE TABLE IF NOT EXISTS telegram_links (
    chat_id    INTEGER PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    language   TEXT NOT NULL DEFAULT 'am',
    linked_at  TEXT,
    conversation_id INTEGER          -- advisor conversation, so short follow-ups keep their context
);
CREATE TABLE IF NOT EXISTS telegram_deliveries (
    alert_id   INTEGER PRIMARY KEY REFERENCES alerts(id) ON DELETE CASCADE,
    chat_id    INTEGER NOT NULL,
    sent_at    TEXT NOT NULL
);
"""


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def local_phone(raw: str) -> str:
    """'+251944000001' / '251944000001' / '0944000001' -> '0944000001'."""
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("251") and len(digits) == 12:
        return "0" + digits[3:]
    if len(digits) == 9:
        return "0" + digits
    return digits


def find_code(text: str) -> str | None:
    m = CODE_RE.search(text or "")
    return "-".join(g.upper() for g in m.groups()) if m else None


class TelegramAPI:
    """The few Bot API calls the bot needs."""

    def __init__(self, token: str, timeout: int = 60):
        self.base = f"https://api.telegram.org/bot{token}"
        self.files = f"https://api.telegram.org/file/bot{token}"
        self.timeout = timeout
        self.http = requests.Session()

    def _call(self, method: str, **params):
        r = self.http.post(f"{self.base}/{method}", json=params, timeout=self.timeout + 10)
        data = r.json()
        if not data.get("ok"):
            raise RuntimeError(f"Telegram {method} failed: {data.get('description')}")
        return data["result"]

    def get_updates(self, offset: int | None) -> list[dict]:
        return self._call("getUpdates", offset=offset, timeout=self.timeout, allowed_updates=["message", "callback_query"])

    def send(self, chat_id: int, text: str, reply_markup: dict | None = None) -> None:
        for i in range(0, max(len(text), 1), MAX_MESSAGE):
            params = {"chat_id": chat_id, "text": text[i:i + MAX_MESSAGE]}
            if reply_markup and i + MAX_MESSAGE >= len(text):
                params["reply_markup"] = reply_markup
            self._call("sendMessage", **params)

    def answer_callback(self, callback_id: str) -> None:
        self._call("answerCallbackQuery", callback_query_id=callback_id)

    def download(self, file_id: str) -> bytes:
        path = self._call("getFile", file_id=file_id)["file_path"]
        r = self.http.get(f"{self.files}/{path}", timeout=self.timeout)
        r.raise_for_status()
        return r.content


class Bot:
    def __init__(self, conn: sqlite3.Connection, api, *, ask_fn=None, transcribe_fn=None, verify_fn=None):
        self.conn = conn
        self.api = api
        self.ask_fn = ask_fn or _ask
        self.transcribe_fn = transcribe_fn or _transcribe
        self.verify_fn = verify_fn or _verify

    # ── state ──
    def _link(self, chat_id: int) -> dict:
        row = self.conn.execute("SELECT user_id, language, conversation_id FROM telegram_links WHERE chat_id=?",
                                (chat_id,)).fetchone()
        return ({"user_id": row[0], "language": row[1], "conversation_id": row[2]} if row
                else {"user_id": None, "language": "am", "conversation_id": None})

    def _user(self, user_id: int | None) -> dict | None:
        if not user_id:
            return None
        cur = self.conn.execute("SELECT * FROM users WHERE id=? AND is_active=1", (user_id,))
        row = cur.fetchone()
        return dict(zip([d[0] for d in cur.description], row)) if row else None

    def _save(self, chat_id: int, **fields) -> None:
        with self.conn:
            self.conn.execute("INSERT OR IGNORE INTO telegram_links (chat_id) VALUES (?)", (chat_id,))
            for k, v in fields.items():
                self.conn.execute(f"UPDATE telegram_links SET {k}=? WHERE chat_id=?", (v, chat_id))

    # ── keyboards ──
    @staticmethod
    def _language_keyboard() -> dict:
        return {"inline_keyboard": [[{"text": name, "callback_data": f"lang:{code}"}] for code, name in LANGS.items()]}

    @staticmethod
    def _phone_keyboard(lang: str) -> dict:
        return {"keyboard": [[{"text": t("tg_share_button", lang), "request_contact": True}]],
                "resize_keyboard": True, "one_time_keyboard": True}

    # ── handling ──
    def handle(self, update: dict) -> None:
        if cb := update.get("callback_query"):
            return self._on_callback(cb)
        msg = update.get("message")
        if not msg or msg.get("chat", {}).get("type") != "private":
            return                                           # groups are not supported (privacy)
        chat_id = msg["chat"]["id"]
        link = self._link(chat_id)
        lang = link["language"]
        try:
            if contact := msg.get("contact"):
                return self._on_contact(chat_id, msg, contact, lang)
            text = (msg.get("text") or "").strip()
            if text.startswith("/start"):
                self._save(chat_id)
                return self.api.send(chat_id, t("tg_welcome", lang), self._language_keyboard())
            if text.startswith("/language"):
                return self.api.send(chat_id, t("tg_choose_language", lang), self._language_keyboard())
            if text.startswith("/help"):
                return self.api.send(chat_id, t("tg_help", lang))
            if text.startswith("/stop"):
                with self.conn:
                    self.conn.execute("DELETE FROM telegram_links WHERE chat_id=?", (chat_id,))
                return self.api.send(chat_id, t("tg_stopped", lang), {"remove_keyboard": True})
            user = self._user(link["user_id"])
            if text.startswith("/tip"):
                return self.api.send(chat_id, self._tip_text(user, lang))
            if code := find_code(text):
                return self.api.send(chat_id, self._check_text(code, user, lang))
            if msg.get("photo"):
                return self.api.send(chat_id, t("tg_photo", lang))
            if not user:
                return self.api.send(chat_id, t("tg_link_first", lang), self._phone_keyboard(lang))
            if voice := msg.get("voice") or msg.get("audio"):
                audio = self.api.download(voice["file_id"])
                try:
                    text = self.transcribe_fn(audio, voice.get("mime_type") or "audio/ogg", lang)
                except ValueError:
                    return self.api.send(chat_id, t("tg_voice_failed", lang))
                except ProviderError:           # speech service busy / out of quota: say so, ask for text
                    log.warning("telegram voice: speech-to-text unavailable")
                    return self.api.send(chat_id, t("tg_voice_unavailable", lang))
                self.api.send(chat_id, t("tg_heard", lang, text=text))
            if text:
                return self.api.send(chat_id, self._answer_text(chat_id, user, text, lang, link["conversation_id"]))
        except Exception:
            log.exception("telegram update failed")
            self.api.send(chat_id, t("tg_error", lang))

    def _tip_text(self, user: dict | None, lang: str) -> str:
        """Today's approved tip(s); without a linked account, only tips for the whole country."""
        from backend import tips

        viewer = user or {"role": "farmer", "region_pcode": None}
        items = tips.today_or_recent(self.conn, viewer, lang)
        if not user:
            items = [i for i in items if not i["region_pcode"]]
        if not items:
            return t("tg_no_tip", lang)
        parts = []
        for i in items:
            cites = "; ".join(s["citation"] for s in i["sources"])
            parts.append(f"💡 {i['title']}\n{i['body']}" + (f"\n({cites})" if cites else ""))
        return "\n\n".join(parts)

    def _on_callback(self, cb: dict) -> None:
        chat_id = cb["message"]["chat"]["id"]
        self.api.answer_callback(cb["id"])
        data = cb.get("data") or ""
        if data.startswith("lang:") and data[5:] in LANGS:
            lang = data[5:]
            self._save(chat_id, language=lang)
            link = self._link(chat_id)
            if link["user_id"]:
                with self.conn:
                    self.conn.execute("UPDATE users SET language=? WHERE id=?", (lang, link["user_id"]))
                self.api.send(chat_id, t("tg_language_set", lang))
            else:
                self.api.send(chat_id, t("tg_share_phone", lang), self._phone_keyboard(lang))

    def _on_contact(self, chat_id: int, msg: dict, contact: dict, lang: str) -> None:
        # Only the sender's own number: Telegram sets contact.user_id to the sender when shared with the button.
        if contact.get("user_id") != msg.get("from", {}).get("id"):
            return self.api.send(chat_id, t("tg_own_number", lang), self._phone_keyboard(lang))
        row = self.conn.execute("SELECT id, name, role FROM users WHERE phone=? AND is_active=1",
                                (local_phone(contact.get("phone_number", "")),)).fetchone()
        if not row:
            return self.api.send(chat_id, t("tg_not_registered", lang), {"remove_keyboard": True})
        if row[2] != "farmer":
            return self.api.send(chat_id, t("tg_not_farmer", lang), {"remove_keyboard": True})
        with self.conn:
            self.conn.execute("DELETE FROM telegram_links WHERE user_id=? AND chat_id != ?", (row[0], chat_id))
        self._save(chat_id, user_id=row[0], conversation_id=None,
                   linked_at=datetime.now().isoformat(sep=" ", timespec="seconds"))
        with self.conn:
            self.conn.execute("INSERT OR IGNORE INTO farmer_profiles (user_id) VALUES (?)", (row[0],))
            self.conn.execute("UPDATE farmer_profiles SET alert_channel='telegram' WHERE user_id=?", (row[0],))
            self.conn.execute("UPDATE users SET language=? WHERE id=?", (lang, row[0]))
        self.api.send(chat_id, t("tg_linked", lang, name=row[1].split(" ")[0]), {"remove_keyboard": True})

    def _answer_text(self, chat_id: int, user: dict, question: str, lang: str, conversation_id: int | None) -> str:
        r = self.ask_fn(self.conn, user, question, lang, conversation_id)
        if r.get("conversation_id"):
            self._save(chat_id, conversation_id=r["conversation_id"])
        lines = [r["answer"]]
        srcs = [f"[{s['ref']}] {s['citation']}" for s in r.get("sources", []) if s.get("citation")]
        if srcs:
            lines += ["", t("tg_sources", lang), *srcs]
        return "\n".join(lines)

    def _check_text(self, code: str, user: dict | None, lang: str) -> str:
        r = self.verify_fn(self.conn, code, user)
        head = t("trust_genuine", lang) if r["result"] == "genuine" else \
            f"{t('trust_warning', lang)}: {t('trust_reason_' + r['reason'], lang)}"
        lines = [head, r["code"]]
        if r.get("product_name"):
            lines.append(t("trust_details", lang, product=r["product_name"], org=r.get("org_name") or "—",
                           batch=r.get("batch_number") or "—"))
        if r.get("placeholder"):
            lines.append(t("trust_placeholder", lang))
        return "\n".join(lines)

    # ── alerts ──
    def deliver_alerts(self) -> int:
        """Send queued alerts of linked farmers that were created after linking; each alert once."""
        from backend.advisory.alerts import render

        cur = self.conn.cursor()
        cur.row_factory = sqlite3.Row
        rows = [dict(r) for r in cur.execute(
            """SELECT a.*, l.chat_id, l.language FROM alerts a JOIN telegram_links l ON l.user_id = a.farmer_id
               LEFT JOIN telegram_deliveries d ON d.alert_id = a.id
               WHERE a.status IN ('queued', 'sent') AND d.alert_id IS NULL AND a.created_at >= l.linked_at
               ORDER BY a.id LIMIT 50""")]
        sent = 0
        for a in rows:
            try:
                self.api.send(a["chat_id"], render(a, a["language"], self.conn))
            except Exception:
                log.exception("alert %s not delivered", a["id"])
                continue
            with self.conn:
                self.conn.execute("INSERT OR IGNORE INTO telegram_deliveries (alert_id, chat_id, sent_at) VALUES (?,?,?)",
                                  (a["id"], a["chat_id"], datetime.now().isoformat(sep=" ", timespec="seconds")))
                self.conn.execute("UPDATE alerts SET status='sent', sent_at=? WHERE id=? AND status='queued'",
                                  (datetime.now().isoformat(sep=" ", timespec="seconds"), a["id"]))
            sent += 1
        return sent


# ── the real services (replaced by fakes in tests) ──

def _ask(conn: sqlite3.Connection, user: dict, question: str, lang: str, conversation_id: int | None = None) -> dict:
    from backend.advisory import registry
    from backend.advisory.assistant import ask
    from backend.advisory.context import build_context

    def ctx(fid: int):
        return build_context(conn, fid, profiles=registry.farmer_profiles(conn), weather=registry.weather(),
                             market=registry.market(conn), input_hub=registry.input_hub(conn))

    return ask(conn, user=user, question=question, farmer_id=user["id"], llm=registry.llm(),
               embedder=registry.embedder(), build_ctx=ctx, language=lang, conversation_id=conversation_id,
               channel="telegram").to_dict()


def _transcribe(audio: bytes, mime: str, lang: str) -> str:
    from backend.advisory import stt

    return stt.transcribe(audio, mime, lang).text


def _verify(conn: sqlite3.Connection, code: str, user: dict | None) -> dict:
    from backend import input_trust

    return input_trust.verify(conn, code, user_id=user["id"] if user else None,
                              woreda_pcode=(user or {}).get("woreda_pcode"))


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    token = env("TELEGRAM_BOT_TOKEN")
    if not token:
        print("TELEGRAM_BOT_TOKEN is not set in .env. Create a bot with @BotFather and add its token.")
        return 1
    from backend.platform_db import get_platform_connection

    conn = get_platform_connection()
    ensure_schema(conn)
    from backend import tips

    tips.ensure_schema(conn)
    api = TelegramAPI(token, timeout=30)
    bot = Bot(conn, api)
    offset, last_alerts = None, 0.0
    log.info("Agri-Stack 360 Telegram bot running")
    while True:
        try:
            for update in api.get_updates(offset):
                offset = update["update_id"] + 1
                bot.handle(update)
            if time.time() - last_alerts > 60:
                if n := bot.deliver_alerts():
                    log.info("delivered %s alerts", n)
                last_alerts = time.time()
        except requests.RequestException as e:
            log.warning("network problem: %s", e)
            time.sleep(10)
        except Exception:
            log.exception("bot loop error")
            time.sleep(5)


if __name__ == "__main__":
    raise SystemExit(main())
