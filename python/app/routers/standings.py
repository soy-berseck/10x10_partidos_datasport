from fastapi import APIRouter
from app.database import supabase
from app.services.statistics import calculate_team_stats

router = APIRouter(prefix="/api/standings", tags=["standings"])


@router.get("/team_standings")
def get_team_standings_table():
    """Lee la tabla team_standings que rellena el trigger de Supabase al finalizar partidos."""
    try:
        standings_res = supabase.table("team_standings").select("*").execute()
        teams_res     = supabase.table("teams").select("id, name, school_id, sport_id, category_id").execute()
        schools_res   = supabase.table("schools").select("id, name, logo_url").execute()
        sports_res    = supabase.table("sports").select("id, name").execute()
        cats_res      = supabase.table("categories").select("id, name, gender").execute()

        standings  = standings_res.data or []
        teams      = teams_res.data     or []
        schools    = schools_res.data   or []
        sports     = sports_res.data    or []
        categories = cats_res.data      or []

        result = []
        for s in standings:
            team_id = s.get("team_id", "")
            team    = next((t  for t  in teams      if t["id"]  == team_id), None)
            if not team:
                continue
            school = next((sc for sc in schools    if sc["id"] == team.get("school_id", "")),  {"name": "Desconocido", "logo_url": None})
            sport  = next((sp for sp in sports     if sp["id"] == team.get("sport_id",  "")),  {"name": ""})
            cat    = next((c  for c  in categories if c["id"]  == team.get("category_id", "")), {"name": "", "gender": ""})

            result.append({
                **s,
                "team_name": team.get("name", ""),
                "school":    school.get("name", ""),
                "logo_url":  school.get("logo_url", None),
                "sport":     sport.get("name", ""),
                "category":  cat.get("name", ""),
                "gender":    cat.get("gender", ""),
            })

        return sorted(result, key=lambda x: (-x.get("points", 0), -x.get("wins", 0)))
    except Exception:
        return []


@router.get("/")
def get_standings(sport: str = None, category: str = None, gender: str = None):
    teams_res   = supabase.table("teams").select("*").execute()
    schools_res = supabase.table("schools").select("id, name, logo_url").execute()
    sports_res  = supabase.table("sports").select("id, name").execute()
    cats_res    = supabase.table("categories").select("id, name, gender, sport_id").execute()
    matches_res = supabase.table("matches").select("*").execute()

    teams_raw  = teams_res.data   or []
    schools    = schools_res.data or []
    sports     = sports_res.data  or []
    categories = cats_res.data    or []
    matches    = matches_res.data or []

    teams = []
    for t in teams_raw:
        school    = next((s for s in schools    if s["id"] == t.get("school_id")),   {"id": "", "name": "Desconocido"})
        sport_obj = next((s for s in sports     if s["id"] == t.get("sport_id")),    {"id": "", "name": ""})
        cat       = next((c for c in categories if c["id"] == t.get("category_id")), {"id": "", "name": "General", "gender": "Masculino", "sport_id": ""})
        teams.append({**t, "school": school, "sport": sport_obj, "category": cat, "gender": cat.get("gender", "Masculino")})

    stats = calculate_team_stats(teams, matches)

    if sport:
        stats = [s for s in stats if s["sport"] == sport]
    if category:
        stats = [s for s in stats if s["category"] == category]
    if gender:
        stats = [s for s in stats if s["gender"] == gender]

    return stats
