"""
website.py — Content of the public website managed by admins: the partner list ("We have worked with").

Each partner has a name and optionally a logo. Uploaded logos are re-encoded as PNG (transparency kept,
at most 480x240 px, no metadata), so only a plain image is ever served; SVG is not accepted (it can carry
scripts). Files live under data/uploads/partners/ (on the /state volume in Docker, backed up with uploads).
"""

from __future__ import annotations

import hashlib
import io
import sqlite3
from pathlib import Path

ROOT = Path(__file__).parent.parent
LOGO_DIR = ROOT / "data" / "uploads" / "partners"
MAX_LOGO_BYTES = 3 * 1024 * 1024
LOGO_BOX = (480, 240)

# First start only (an emptied list stays empty). Order as shown on the website.
DEFAULT_PARTNERS = (
    "Agricultural Transformation Institute (ATI)",
    "World Bank",
    "UNDP",
    "Ethiopian Diaspora Trust Fund",
    "Ministry of Labor and Skills",
    "Innovative Finance Lab",
)


def ensure_schema(conn: sqlite3.Connection) -> None:
    new = not conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='website_partners'").fetchone()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS website_partners (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            logo_path   TEXT,                 -- relative to data/uploads/partners
            sort_order  INTEGER NOT NULL DEFAULT 0,
            active      INTEGER NOT NULL DEFAULT 1,
            created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            updated_at  TEXT
        );
    """)
    if new:
        conn.executemany("INSERT INTO website_partners (name, sort_order) VALUES (?, ?)",
                         [(n, i) for i, n in enumerate(DEFAULT_PARTNERS)])
    conn.commit()


def _row(r: sqlite3.Row) -> dict:
    d = dict(r)
    d["active"] = bool(d["active"])
    d["logo_url"] = f"/site/partners/{d['id']}/logo?v={Path(d['logo_path']).stem.split('-')[-1]}" if d["logo_path"] else None
    d.pop("logo_path")
    return d


def list_partners(conn: sqlite3.Connection, *, public: bool) -> list[dict]:
    where = " WHERE active = 1" if public else ""
    rows = conn.execute(f"SELECT * FROM website_partners{where} ORDER BY sort_order, id").fetchall()
    out = [_row(r) for r in rows]
    if public:
        out = [{"id": p["id"], "name": p["name"], "logo_url": p["logo_url"]} for p in out]
    return out


def get(conn: sqlite3.Connection, partner_id: int) -> dict | None:
    r = conn.execute("SELECT * FROM website_partners WHERE id=?", (partner_id,)).fetchone()
    return _row(r) if r else None


def clean_name(name: str | None) -> str:
    name = (name or "").strip()
    if not name or len(name) > 120:
        raise ValueError("Give the partner's name (at most 120 characters).")
    return name


def clean_logo(data: bytes) -> bytes:
    """A fresh PNG of the uploaded image (fits LOGO_BOX, transparency kept). Raises ValueError for non-images."""
    from PIL import Image, UnidentifiedImageError

    if not data:
        raise ValueError("The file is empty.")
    if len(data) > MAX_LOGO_BYTES:
        raise ValueError("The logo is larger than 3 MB.")
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except (UnidentifiedImageError, OSError) as e:
        raise ValueError("Upload a PNG, JPG or WebP image.") from e
    if img.format not in ("PNG", "JPEG", "WEBP"):
        raise ValueError("Upload a PNG, JPG or WebP image.")
    img = img.convert("RGBA")
    img.thumbnail(LOGO_BOX)
    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


def _store_logo(partner_id: int, png: bytes) -> str:
    rel = f"{partner_id}-{hashlib.sha256(png).hexdigest()[:10]}.png"
    LOGO_DIR.mkdir(parents=True, exist_ok=True)
    (LOGO_DIR / rel).write_bytes(png)
    return rel


def _remove_file(rel: str | None) -> None:
    if not rel:
        return
    path = (LOGO_DIR / rel).resolve()
    if LOGO_DIR.resolve() in path.parents and path.exists():
        path.unlink()


def create(conn: sqlite3.Connection, name: str, logo: bytes | None) -> dict:
    name = clean_name(name)
    png = clean_logo(logo) if logo else None
    order = (conn.execute("SELECT MAX(sort_order) FROM website_partners").fetchone()[0] or 0) + 1
    pid = conn.execute("INSERT INTO website_partners (name, sort_order) VALUES (?, ?)", (name, order)).lastrowid
    if png:
        conn.execute("UPDATE website_partners SET logo_path=? WHERE id=?", (_store_logo(pid, png), pid))
    conn.commit()
    return get(conn, pid)


def update(conn: sqlite3.Connection, partner_id: int, *, name: str | None = None, active: bool | None = None) -> dict | None:
    if not get(conn, partner_id):
        return None
    if name is not None:
        conn.execute("UPDATE website_partners SET name=? WHERE id=?", (clean_name(name), partner_id))
    if active is not None:
        conn.execute("UPDATE website_partners SET active=? WHERE id=?", (1 if active else 0, partner_id))
    conn.execute("UPDATE website_partners SET updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id=?", (partner_id,))
    conn.commit()
    return get(conn, partner_id)


def set_logo(conn: sqlite3.Connection, partner_id: int, logo: bytes | None) -> dict | None:
    """Replace the logo (None removes it, and the name is shown instead)."""
    r = conn.execute("SELECT logo_path FROM website_partners WHERE id=?", (partner_id,)).fetchone()
    if not r:
        return None
    rel = _store_logo(partner_id, clean_logo(logo)) if logo else None
    conn.execute("UPDATE website_partners SET logo_path=?, updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id=?",
                 (rel, partner_id))
    conn.commit()
    if r[0] != rel:
        _remove_file(r[0])
    return get(conn, partner_id)


def reorder(conn: sqlite3.Connection, ids: list[int]) -> list[dict]:
    """Website order = the order of `ids`; partners left out keep their place after them."""
    known = [r[0] for r in conn.execute("SELECT id FROM website_partners ORDER BY sort_order, id")]
    order = [i for i in ids if i in known] + [i for i in known if i not in ids]
    conn.executemany("UPDATE website_partners SET sort_order=? WHERE id=?", [(n, pid) for n, pid in enumerate(order)])
    conn.commit()
    return list_partners(conn, public=False)


def delete(conn: sqlite3.Connection, partner_id: int) -> bool:
    r = conn.execute("SELECT logo_path FROM website_partners WHERE id=?", (partner_id,)).fetchone()
    if not r:
        return False
    conn.execute("DELETE FROM website_partners WHERE id=?", (partner_id,))
    conn.commit()
    _remove_file(r[0])
    return True


def logo_file(conn: sqlite3.Connection, partner_id: int) -> Path | None:
    """A partner's logo file. Hidden partners' logos are served too: the admin page previews them with a plain
    <img> (no sign-in header), and a logo is public material anyway."""
    r = conn.execute("SELECT logo_path FROM website_partners WHERE id=?", (partner_id,)).fetchone()
    if not r or not r[0]:
        return None
    path = (LOGO_DIR / r[0]).resolve()
    return path if LOGO_DIR.resolve() in path.parents and path.exists() else None
