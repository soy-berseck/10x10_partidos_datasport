from fastapi import APIRouter
from app.database import supabase
from app.services.statistics import calculate_player_stats, calculate_team_stats

router = APIRouter(prefix="/api/statistics", tags=["statistics"])


@router.get("/players")
def get_player_statistics(sport: str = None, school_id: str = None):
    players_res = supabase.table("players").select("*").execute()
    teams_res = supabase.table("teams").select("*").execute()
    schools_res = supabase.table("schools").select("id, name, logo_url").execute()
    sports_res = supabase.table("sports").select("id, name").execute()
    cats_res = supabase.table("categories").select("id, name, gender, sport_id").execute()
    matches_res = supabase.table("matches").select("*").execute()
    events_res = supabase.table("match_events").select("*").execute()

    players = players_res.data or []
    teams_raw = teams_res.data or []
    schools = schools_res.data or []
    sports = sports_res.data or []
    categories = cats_res.data or []
    matches = matches_res.data or []
    events = events_res.data or []

    # Enriquecer teams
    teams = []
    for t in teams_raw:
        school = next((s for s in schools if s["id"] == t.get("school_id")), {"id": "", "name": "Desconocido"})
        sport_obj = next((s for s in sports if s["id"] == t.get("sport_id")), {"id": "", "name": ""})
        cat = next((c for c in categories if c["id"] == t.get("category_id")), {"id": "", "name": "General", "gender": "Masculino", "sport_id": ""})
        teams.append({**t, "school": school, "sport": sport_obj, "category": cat, "gender": cat.get("gender", "Masculino")})

    # Enriquecer eventos con sport del partido (matches tiene sport_id, no sport)
    match_sport_map = {}
    for m in matches:
        sport_id = m.get("sport_id", "")
        sport_obj = next((s for s in sports if s["id"] == sport_id), {"name": ""})
        match_sport_map[m["id"]] = sport_obj.get("name", "")
    for e in events:
        e["sport"] = match_sport_map.get(e.get("match_id", ""), "")

    stats = calculate_player_stats(players, teams, matches, events)

    if sport:
        stats = [s for s in stats if any(ss["sport"] == sport for ss in s.get("sport_stats", []))]

    return stats


@router.get("/teams")
def get_team_statistics(sport: str = None, category: str = None, gender: str = None):
    teams_res = supabase.table("teams").select("*").execute()
    schools_res = supabase.table("schools").select("id, name, logo_url").execute()
    sports_res = supabase.table("sports").select("id, name").execute()
    cats_res = supabase.table("categories").select("id, name, gender, sport_id").execute()
    matches_res = supabase.table("matches").select("*").execute()

    teams_raw = teams_res.data or []
    schools = schools_res.data or []
    sports = sports_res.data or []
    categories = cats_res.data or []
    matches = matches_res.data or []

    teams = []
    for t in teams_raw:
        school = next((s for s in schools if s["id"] == t.get("school_id")), {"id": "", "name": "Desconocido"})
        sport_obj = next((s for s in sports if s["id"] == t.get("sport_id")), {"id": "", "name": ""})
        cat = next((c for c in categories if c["id"] == t.get("category_id")), {"id": "", "name": "General", "gender": "Masculino", "sport_id": ""})
        teams.append({**t, "school": school, "sport": sport_obj, "category": cat, "gender": cat.get("gender", "Masculino")})

    stats = calculate_team_stats(teams, matches)

    if sport:
        stats = [s for s in stats if s["sport"] == sport]
    if category:
        stats = [s for s in stats if s["category"] == category]
    if gender:
        stats = [s for s in stats if s["gender"] == gender]

    return stats
