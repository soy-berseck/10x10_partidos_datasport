from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import supabase

router = APIRouter(prefix="/api/individual-medals", tags=["individual_medals"])


class MedalCreate(BaseModel):
    sport_id: str
    school_id: str
    medal: str  # gold, silver, bronze
    description: Optional[str] = ""


@router.get("/")
def get_all_medals():
    """Retorna todas las medallas individuales con info de deporte y colegio."""
    res = supabase.table("individual_medals").select("*").order("created_at", desc=True).execute()
    medals = res.data or []

    # Enriquecer con nombres
    sports = {s["id"]: s["name"] for s in (supabase.table("sports").select("id, name").execute().data or [])}
    schools = {}
    for s in (supabase.table("schools").select("id, name, logo_url").execute().data or []):
        schools[s["id"]] = s

    for m in medals:
        m["sport_name"] = sports.get(m.get("sport_id"), "")
        school = schools.get(m.get("school_id"), {})
        m["school_name"] = school.get("name", "")
        m["school_logo"] = school.get("logo_url")

    return medals


@router.post("/")
def add_medal(data: MedalCreate):
    """Agrega una medalla individual."""
    if data.medal not in ("gold", "silver", "bronze"):
        raise HTTPException(status_code=400, detail="Medal must be gold, silver, or bronze")

    row = {
        "sport_id": data.sport_id,
        "school_id": data.school_id,
        "medal": data.medal,
        "description": data.description or "",
    }
    res = supabase.table("individual_medals").insert(row).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Error al guardar medalla")
    return res.data[0]


@router.delete("/{medal_id}")
def delete_medal(medal_id: str):
    """Elimina una medalla individual."""
    supabase.table("individual_medals").delete().eq("id", medal_id).execute()
    return {"deleted": medal_id}


@router.get("/summary")
def medals_summary():
    """Resumen de medallas por colegio (para el ranking olimpico)."""
    res = supabase.table("individual_medals").select("*").execute()
    medals = res.data or []

    schools_res = supabase.table("schools").select("id, name, logo_url").execute()
    schools = {s["id"]: s for s in (schools_res.data or [])}

    sports_res = supabase.table("sports").select("id, name").execute()
    sports = {s["id"]: s["name"] for s in (sports_res.data or [])}

    # Agrupar por colegio
    summary = {}
    for m in medals:
        sid = m.get("school_id", "")
        school = schools.get(sid, {})
        name = school.get("name", "Desconocido")
        if name not in summary:
            summary[name] = {"school": name, "logo_url": school.get("logo_url"), "golds": 0, "silvers": 0, "bronzes": 0, "details": []}
        if m["medal"] == "gold":
            summary[name]["golds"] += 1
        elif m["medal"] == "silver":
            summary[name]["silvers"] += 1
        elif m["medal"] == "bronze":
            summary[name]["bronzes"] += 1
        sport_name = sports.get(m.get("sport_id", ""), "")
        summary[name]["details"].append({
            "sport": sport_name,
            "medal": m["medal"],
            "description": m.get("description", ""),
        })

    return list(summary.values())
