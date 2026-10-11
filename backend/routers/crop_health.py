"""
routers/crop_health.py — AI crop diagnosis + health report history.
"""

import asyncio
import json
from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.platform_db import pquery, pquery_one, pexecute
from backend.auth import require_permission
from backend.access import farm_for_read
from backend.permissions import P, has_permission

router = APIRouter(prefix="/crop-health", tags=["crop-health"])

# Every endpoint needs crop_health:use; farm_for_read() then limits it to farms
# the user may see (own, own region for agents, all for admins).
_crop_health = require_permission(P.CROP_HEALTH_USE)

DISEASE_LIBRARY = {
    "maize": [
        {
            "disease": "Northern Leaf Blight (NLB)",
            "pathogen": "Exserohilum turcicum",
            "keywords": ["gray", "lesion", "blight", "leaf", "brown", "cigar"],
            "severity": "moderate",
            "confidence": 87.0,
            "visual_cues": [
                "Long, cigar-shaped gray-green lesions on lower leaves",
                "Lesions with wavy, diffuse borders (not angular)",
                "Older lesions turning tan/brown with dark spore masses",
            ],
            "recommended_action": "Apply Mancozeb 80WP at 2.5g/litre water. Spray every 7–10 days for 2–3 applications.",
            "days_followup": 14,
        },
        {
            "disease": "Maize Streak Virus (MSV)",
            "pathogen": "Maize streak mastrevirus (leafhopper-transmitted)",
            "keywords": ["streak", "yellow", "stripe", "mottled", "narrow"],
            "severity": "high",
            "confidence": 83.0,
            "visual_cues": [
                "Fine, broken yellow streaks along leaf veins",
                "Stunted plant growth",
                "Leaves with intermittent yellow and green patches",
            ],
            "recommended_action": "No chemical cure. Remove infected plants. Control leafhopper vectors with Imidacloprid 70WS seed treatment next season.",
            "days_followup": 7,
        },
        {
            "disease": "Fall Armyworm (FAW)",
            "pathogen": "Spodoptera frugiperda",
            "keywords": ["armyworm", "caterpillar", "hole", "worm", "frass", "chew"],
            "severity": "high",
            "confidence": 91.0,
            "visual_cues": [
                "Ragged holes in leaves from caterpillar feeding",
                "Sawdust-like frass in leaf whorls",
                "Caterpillars (1–4 cm) with inverted Y on head",
            ],
            "recommended_action": "Apply Emamectin Benzoate 1.9EC at 400ml/ha. Target young larvae in whorls.",
            "days_followup": 10,
        },
    ],
    "coffee": [
        {
            "disease": "Coffee Berry Borer (CBB)",
            "pathogen": "Hypothenemus hampei",
            "keywords": ["berry", "borer", "hole", "berry", "damage", "black"],
            "severity": "high",
            "confidence": 89.0,
            "visual_cues": [
                "Small circular entry holes in coffee berries",
                "Premature berry drop",
                "Infested berries with powdery frass",
            ],
            "recommended_action": "Harvest ripe berries promptly. Apply Beauveria bassiana (biological) or Chlorpyrifos (chemical) as last resort.",
            "days_followup": 14,
        },
        {
            "disease": "Coffee Leaf Rust (CLR)",
            "pathogen": "Hemileia vastatrix",
            "keywords": ["rust", "orange", "powder", "yellow spot", "underside"],
            "severity": "moderate",
            "confidence": 85.0,
            "visual_cues": [
                "Yellow-orange powdery pustules on leaf undersides",
                "Corresponding pale yellow spots on upper leaf surface",
                "Premature defoliation in severe cases",
            ],
            "recommended_action": "Apply Copper Oxychloride 50WP (3g/litre) every 3 weeks during rainy season.",
            "days_followup": 21,
        },
    ],
    "teff": [
        {
            "disease": "Head Smut",
            "pathogen": "Tilletia tef",
            "keywords": ["smut", "black powder", "grain", "head", "dark"],
            "severity": "high",
            "confidence": 88.0,
            "visual_cues": [
                "Entire seed heads replaced by black smut balls",
                "Strong fishy/chemical smell",
                "Black powder dispersed when smut ball ruptures",
            ],
            "recommended_action": "Use certified disease-free seed. Treat seed with Carboxin + Thiram 37.5%+37.5% DS (2g/kg seed) before planting.",
            "days_followup": 0,
        },
    ],
}

GENERIC_ADVICE = {
    "disease": "Unidentified Crop Stress",
    "pathogen": None,
    "keywords": [],
    "severity": "low",
    "confidence": 55.0,
    "visual_cues": ["Symptoms do not match a known pattern — contact your local extension officer for physical inspection"],
    "recommended_action": "Document symptoms with photos and consult your agricultural extension agent.",
    "days_followup": 7,
}


def _match_disease(crop: str, description: str) -> dict:
    crop_lower = crop.lower()
    desc_lower = description.lower()
    library = []
    for key, entries in DISEASE_LIBRARY.items():
        if key in crop_lower:
            library = entries
            break

    best = None
    best_hits = 0
    for entry in library:
        hits = sum(1 for kw in entry["keywords"] if kw in desc_lower)
        if hits > best_hits:
            best_hits = hits
            best = entry

    return best if best else GENERIC_ADVICE


def explanation_prompt(disease: dict, crop: str, description: str) -> str:
    """Prompt for the external AI. Anonymised: no farmer name, phone or field name."""
    return (
        f"You are an agricultural AI assistant for Ethiopian farmers. "
        f"A farmer described these symptoms on their {crop} field:\n\n"
        f"\"{description}\"\n\n"
        f"Our system diagnosed: **{disease['disease']}** (Severity: {disease['severity']}, Confidence: {disease['confidence']}%)\n"
        f"Recommended action: {disease['recommended_action']}\n\n"
        f"Write 2–3 short, plain-language sentences (no jargon) explaining:\n"
        f"1. What this disease is and why it's harmful\n"
        f"2. Why the recommended action works\n"
        f"Write as if talking to a smallholder farmer who may not read well. Be reassuring but urgent if needed."
    )


async def _get_ai_explanation(disease: dict, crop: str, description: str) -> str:
    """Call Gemini to produce a plain-language explanation."""
    try:
        from backend.ai_keys import call_gemini

        prompt = explanation_prompt(disease, crop, description)

        # Run the blocking SDK call off the event loop so other requests are not held up
        response = await asyncio.to_thread(
            call_gemini, lambda client: client.models.generate_content(model="gemini-3.6-flash", contents=prompt)
        )
        return response.text.strip()
    except Exception:
        return f"{disease['disease']} has been detected on your {crop}. Follow the recommended treatment promptly to protect your harvest."


class DiagnoseRequest(BaseModel):
    farm_id: int
    description: str
    crop: str | None = None


class ReportIn(BaseModel):
    farm_id: int
    disease: str
    pathogen: str | None = None
    severity: str
    confidence: float | None = None
    visual_cues: list[str] = []
    recommended_action: str | None = None
    follow_up_date: str | None = None
    ai_explanation: str | None = None


@router.post("/diagnose")
async def diagnose(req: DiagnoseRequest, user: dict = Depends(_crop_health)):
    farm = farm_for_read(user, req.farm_id)

    crop = req.crop or farm["crop_name"]
    disease = _match_disease(crop, req.description)
    follow_up = (date.today() + timedelta(days=disease["days_followup"])).isoformat() if disease["days_followup"] else None
    ai_text = await _get_ai_explanation(disease, crop, req.description)

    return {
        "farm_id": req.farm_id,
        "farm_name": farm["field_name"],
        "crop": crop,
        "disease": disease["disease"],
        "pathogen": disease["pathogen"],
        "severity": disease["severity"],
        "confidence": disease["confidence"],
        "visual_cues": disease["visual_cues"],
        "recommended_action": disease["recommended_action"],
        "follow_up_date": follow_up,
        "ai_explanation": ai_text,
        # The keyword library above holds example product names and doses that were
        # never verified. Clients must show them as demo data (see advisory module).
        "demo_data": True,
    }


@router.get("/reports")
async def list_reports(farm_id: int | None = None, user: dict = Depends(_crop_health)):
    if farm_id:
        farm_for_read(user, farm_id)
        reports = pquery("SELECT * FROM health_reports WHERE farm_id=? ORDER BY created_at DESC", (farm_id,))
    elif has_permission(user["role"], P.FARMS_MANAGE_ALL):
        reports = pquery("SELECT * FROM health_reports ORDER BY created_at DESC")
    elif has_permission(user["role"], P.FARMS_READ_REGION):
        reports = pquery(
            "SELECT hr.* FROM health_reports hr JOIN farms f ON f.id=hr.farm_id JOIN users u ON u.id=f.user_id "
            "LEFT JOIN farmer_profiles p ON p.user_id=u.id "
            "WHERE u.region=? AND (u.id=? OR p.consent_data=1) ORDER BY hr.created_at DESC",
            (user.get("region") or "", user["id"]),
        )
    else:
        reports = pquery(
            "SELECT hr.* FROM health_reports hr JOIN farms f ON f.id=hr.farm_id WHERE f.user_id=? ORDER BY hr.created_at DESC",
            (user["id"],),
        )

    for r in reports:
        if r.get("visual_cues") and isinstance(r["visual_cues"], str):
            try:
                r["visual_cues"] = json.loads(r["visual_cues"])
            except Exception:
                pass
    return reports


@router.post("/reports", status_code=201)
async def save_report(req: ReportIn, user: dict = Depends(_crop_health)):
    farm_for_read(user, req.farm_id)

    if req.severity not in ("low", "moderate", "high", "critical"):
        raise HTTPException(400, "severity must be low, moderate, high, or critical")

    # update farm status based on severity
    status_map = {"low": "healthy", "moderate": "warning", "high": "critical", "critical": "critical"}
    pexecute("UPDATE farms SET status=? WHERE id=?", (status_map[req.severity], req.farm_id))

    report_id = pexecute(
        "INSERT INTO health_reports (farm_id, user_id, disease, pathogen, severity, confidence, visual_cues, recommended_action, follow_up_date, ai_explanation) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (
            req.farm_id, user["id"], req.disease, req.pathogen, req.severity,
            req.confidence, json.dumps(req.visual_cues),
            req.recommended_action, req.follow_up_date, req.ai_explanation,
        ),
    )
    return pquery_one("SELECT * FROM health_reports WHERE id=?", (report_id,))


@router.put("/reports/{report_id}/resolve")
async def resolve_report(report_id: int, user: dict = Depends(_crop_health)):
    report = pquery_one("SELECT * FROM health_reports WHERE id=?", (report_id,))
    if not report:
        raise HTTPException(404, "Report not found")
    # Whoever may see the farm (owner, agent in that region, admin) may close its reports.
    farm_for_read(user, report["farm_id"])
    pexecute("UPDATE health_reports SET resolved=1 WHERE id=?", (report_id,))

    # if no unresolved reports on that farm, set farm status back to healthy
    open_count = pquery_one(
        "SELECT COUNT(*) as cnt FROM health_reports WHERE farm_id=? AND resolved=0",
        (report["farm_id"],),
    )
    if open_count and open_count["cnt"] == 0:
        pexecute("UPDATE farms SET status='healthy' WHERE id=?", (report["farm_id"],))
    return {"resolved": True}
