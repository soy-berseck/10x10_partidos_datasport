from fastapi import APIRouter, HTTPException
from app.database import supabase
from app.models import MatchCreate, MatchUpdate

router = APIRouter(prefix="/api/matches", tags=["matches"])


def _enrich_match(match: dict, teams: list, schools: list, sports: list, categories: list) -> dict:
    """
    Enriquece un partido con info de colegios y nombres de deporte/categoría.
    La tabla usa: team_a, team_b, sport_id (uuid), category_id (uuid).
    """
    def find_school(team_id: str):
        team = next((t for t in teams if t["id"] == team_id), None)
        if not team:
            return {"id": "", "name": "Desconocido", "logo_url": None}
        school_id = team.get("school_id", "")
        return next((s for s in schools if s["id"] == school_id),
                    {"id": "", "name": "Desconocido", "logo_url": None})

    team_a = match.get("team_a", "")
    team_b = match.get("team_b", "")

    sport_id  = match.get("sport_id", "")
    sport_obj = next((s for s in sports if s["id"] == sport_id), {"name": ""})
    sport_name = sport_obj.get("name", "")

    cat_id  = match.get("category_id", "")
    cat_obj = next((c for c in categories if c["id"] == cat_id),
                   {"name": "", "gender": ""})

    return {
        **match,
        # Alias normalizados que usa el frontend
        "team1_id":    team_a,
        "team2_id":    team_b,
        "sport":       sport_name,
        "category":    cat_obj.get("name", ""),
        "gender":      cat_obj.get("gender", ""),
        "team1_score": match.get("team1_score", 0),
        "team2_score": match.get("team2_score", 0),
        "team1": {"school": find_school(team_a)},
        "team2": {"school": find_school(team_b)},
    }


def _fetch_lookup_data():
    teams_res  = supabase.table("teams").select("id, school_id").execute()
    schools_res = supabase.table("schools").select("id, name, logo_url").execute()
    sports_res  = supabase.table("sports").select("id, name").execute()
    cats_res    = supabase.table("categories").select("id, name, gender").execute()
    return (
        teams_res.data  or [],
        schools_res.data or [],
        sports_res.data  or [],
        cats_res.data    or [],
    )


@router.get("/")
def get_matches(
    sport: str = None,
    status: str = None,
    date: str = None,
):
    try:
        teams, schools, sports_list, categories = _fetch_lookup_data()

        query = supabase.table("matches").select("*").order("match_date", desc=False)

        if sport:
            sport_obj = next((s for s in sports_list if s["name"] == sport), None)
            if sport_obj:
                query = query.eq("sport_id", sport_obj["id"])

        if status:
            query = query.eq("status", status)
        if date:
            query = query.gte("match_date", f"{date}T00:00").lte("match_date", f"{date}T23:59")

        matches_res = query.execute()
        return [_enrich_match(m, teams, schools, sports_list, categories)
                for m in (matches_res.data or [])]
    except Exception as e:
        import traceback
        print("[ERROR] /api/matches/:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error al obtener partidos: {str(e)}")


@router.get("/live")
def get_live_matches():
    matches_res = supabase.table("matches").select("*").eq("status", "live").execute()
    teams, schools, sports, categories = _fetch_lookup_data()
    return [_enrich_match(m, teams, schools, sports, categories)
            for m in (matches_res.data or [])]


@router.get("/{match_id}")
def get_match(match_id: str):
    match_res = supabase.table("matches").select("*").eq("id", match_id).single().execute()
    if not match_res.data:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    teams, schools, sports, categories = _fetch_lookup_data()
    return _enrich_match(match_res.data, teams, schools, sports, categories)


@router.post("/", status_code=201)
def create_match(match: MatchCreate):
    data = match.model_dump(exclude_none=True)
    res = supabase.table("matches").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Error al crear partido")
    return res.data[0]


@router.put("/{match_id}")
def update_match(match_id: str, update: MatchUpdate):
    data = update.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    res = supabase.table("matches").update(data).eq("id", match_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    return res.data[0]


@router.delete("/{match_id}", status_code=204)
def delete_match(match_id: str):
    supabase.table("matches").delete().eq("id", match_id).execute()
