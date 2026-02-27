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


@router.delete("/{team_id}", status_code=204)
def delete_team(team_id: str):
    supabase.table("teams").delete().eq("id", team_id).execute()
