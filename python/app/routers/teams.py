from fastapi import APIRouter, HTTPException
from app.database import supabase
from app.models import TeamCreate

router = APIRouter(prefix="/api/teams", tags=["teams"])


def _enrich_team(team: dict, schools: list, sports: list, categories: list) -> dict:
    school = next((s for s in schools if s["id"] == team.get("school_id")), {"id": "", "name": "Desconocido", "logo_url": None})
    sport = next((s for s in sports if s["id"] == team.get("sport_id")), {"id": "", "name": "Fútbol"})
    category = next((c for c in categories if c["id"] == team.get("category_id")), {"id": "", "name": "General", "gender": "Masculino", "sport_id": ""})
    gender = category.get("gender", "Masculino")
    # Generar nombre si la tabla no lo tiene
    generated_name = team.get("name") or f"{school['name']} - {sport['name']}"
    return {
        **team,
        "name": generated_name,
        "school": school,
        "sport": sport,
        "category": category,
        "gender": gender,
    }


@router.get("/", response_model=list[dict])
def get_teams():
    teams_res = supabase.table("teams").select("*").execute()
    schools_res = supabase.table("schools").select("id, name, logo_url").execute()
    sports_res = supabase.table("sports").select("id, name").execute()
    cats_res = supabase.table("categories").select("id, name, gender, sport_id").execute()

    teams = teams_res.data or []
    schools = schools_res.data or []
    sports = sports_res.data or []
    categories = cats_res.data or []

    return [_enrich_team(t, schools, sports, categories) for t in teams]


@router.get("/{team_id}")
def get_team(team_id: str):
    team_res = supabase.table("teams").select("*").eq("id", team_id).single().execute()
    if not team_res.data:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    schools_res = supabase.table("schools").select("id, name, logo_url").execute()
    sports_res = supabase.table("sports").select("id, name").execute()
    cats_res = supabase.table("categories").select("id, name, gender, sport_id").execute()

    return _enrich_team(
        team_res.data,
        schools_res.data or [],
        sports_res.data or [],
        cats_res.data or [],
    )


@router.post("/", status_code=201)
def create_team(team: TeamCreate):
    res = supabase.table("teams").insert(team.model_dump()).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Error al crear equipo")
    return res.data[0]


@router.patch("/{team_id}/group")
def set_team_group(team_id: str, body: dict):
    """Asigna el grupo (A, B, etc.) a un equipo."""
    group_name = body.get("group_name", "")
    res = supabase.table("teams").update({"group_name": group_name}).eq("id", team_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return {"team_id": team_id, "group_name": group_name}


@router.delete("/{team_id}")
def delete_team(team_id: str):
    """Elimina un equipo y todos sus jugadores y partidos."""
    # Delete match_events for matches involving this team
    matches_a = supabase.table("matches").select("id").eq("team_a", team_id).execute()
    matches_b = supabase.table("matches").select("id").eq("team_b", team_id).execute()
    match_ids = [m["id"] for m in (matches_a.data or []) + (matches_b.data or [])]
    for mid in match_ids:
        supabase.table("match_events").delete().eq("match_id", mid).execute()

    # Delete matches
    supabase.table("matches").delete().eq("team_a", team_id).execute()
    supabase.table("matches").delete().eq("team_b", team_id).execute()

    # Delete players
    supabase.table("players").delete().eq("team_id", team_id).execute()

    # Delete team
    supabase.table("teams").delete().eq("id", team_id).execute()
    return {"deleted": team_id}
