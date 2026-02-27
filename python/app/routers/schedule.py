from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import supabase
from app.models import SchedulingRuleCreate
from app.services.scheduling import generate_tournament_schedule

router = APIRouter(prefix="/api/schedule", tags=["schedule"])


class GenerateAllRequest(BaseModel):
    start_date: Optional[str] = None   # Si es None, usa fechas automáticas por deporte
    courts: list[str] = []             # Si vacío, usa canchas automáticas por categoría
    match_duration_minutes: Optional[int] = None   # Si None, usa reglas del deporte
    rest_between_matches_minutes: Optional[int] = None
    clear_existing: bool = False


@router.post("/generate")
def generate_schedule(rule: SchedulingRuleCreate):
    """Genera un calendario round-robin y lo guarda en Supabase."""
    teams_res = supabase.table("teams").select("*").execute()
    schools_res = supabase.table("schools").select("id, name, logo_url").execute()
    sports_res = supabase.table("sports").select("id, name").execute()
    cats_res = supabase.table("categories").select("id, name, gender, sport_id").execute()

    teams_raw = teams_res.data or []
    schools = schools_res.data or []
    sports = sports_res.data or []
    categories = cats_res.data or []

    # Enriquecer teams
    teams = []
    for t in teams_raw:
        school = next((s for s in schools if s["id"] == t.get("school_id")), {"id": "", "name": "Desconocido"})
        sport_obj = next((s for s in sports if s["id"] == t.get("sport_id")), {"id": "", "name": ""})
        cat = next((c for c in categories if c["id"] == t.get("category_id")), {"id": "", "name": "General", "gender": "Masculino", "sport_id": ""})
        teams.append({**t, "school": school, "sport": sport_obj, "category": cat, "gender": cat.get("gender", "Masculino")})

    matches = generate_tournament_schedule(teams, rule.model_dump())

    if not matches:
        raise HTTPException(
            status_code=400,
            detail=f"No se encontraron equipos suficientes para {rule.sport} / {rule.category} / {rule.gender}"
        )

    # Guardar en Supabase
    res = supabase.table("matches").insert(matches).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Error al guardar partidos")

    return {"generated": len(res.data), "matches": res.data}


@router.post("/generate-all")
def generate_all_matches(req: GenerateAllRequest):
    """Genera el torneo completo todos contra todos por deporte y categoría."""
    try:
        teams_res = supabase.table("teams").select("*").execute()
        schools_res = supabase.table("schools").select("id, name, logo_url").execute()
        sports_res = supabase.table("sports").select("id, name").execute()
        cats_res = supabase.table("categories").select("id, name, gender, sport_id").execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error leyendo datos: {e}")

    teams_raw = teams_res.data or []
    schools = schools_res.data or []
    sports = sports_res.data or []
    categories = cats_res.data or []

    # Enriquecer teams
    teams = []
    for t in teams_raw:
        school = next((s for s in schools if s["id"] == t.get("school_id")), {"id": "", "name": "Desconocido"})
        sport_obj = next((s for s in sports if s["id"] == t.get("sport_id")), {"id": "", "name": ""})
        cat = next((c for c in categories if c["id"] == t.get("category_id")), {"id": "", "name": "General", "gender": "Masculino", "sport_id": ""})
        teams.append({**t, "school": school, "sport": sport_obj, "category": cat, "gender": cat.get("gender", "Masculino")})

    # Agrupar por (deporte, categoría, género)
    groups: dict = {}
    for team in teams:
        sport_name = team["sport"].get("name", "")
        cat_name = team["category"].get("name", "")
        gender = team["category"].get("gender", team.get("gender", "Masculino"))
        key = (sport_name, cat_name, gender)
        groups.setdefault(key, []).append(team)

    if req.clear_existing:
        try:
            supabase.table("matches").delete().gte("created_at", "2000-01-01").execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error limpiando partidos: {e}")

    all_matches = []
    groups_summary = []

    # court_state compartido entre todos los grupos para evitar doble-reserva de canchas
    court_state: dict = {}

    for (sport_name, cat_name, gender), group_teams in groups.items():
        if len(group_teams) < 2:
            continue
        rule = {
            "sport": sport_name,
            "category": cat_name,
            "gender": gender,
            "courts": req.courts,  # [] = usar asignación automática por categoría
            "start_date": req.start_date,
            "match_duration_minutes": req.match_duration_minutes,
            "rest_between_matches_minutes": req.rest_between_matches_minutes,
        }
        matches = generate_tournament_schedule(group_teams, rule, court_state)
        all_matches.extend(matches)
        groups_summary.append({
            "sport": sport_name,
            "category": cat_name,
            "gender": gender,
            "teams": len(group_teams),
            "matches": len(matches),
        })

    if not all_matches:
        raise HTTPException(status_code=400, detail="No se encontraron grupos con suficientes equipos")

    # Probar primero con un solo partido para detectar errores de columna
    test_batch = [all_matches[0]]
    try:
        test_res = supabase.table("matches").insert(test_batch).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al insertar en Supabase: {str(e)}")

    if not test_res.data:
        raise HTTPException(status_code=500, detail="Supabase rechazó el insert. Verifica las columnas de la tabla matches.")

    inserted = len(test_res.data)

    # Insertar el resto en lotes de 100
    for i in range(1, len(all_matches), 100):
        batch = all_matches[i:i + 100]
        try:
            res = supabase.table("matches").insert(batch).execute()
            if res.data:
                inserted += len(res.data)
        except Exception as e:
            # Continuar aunque falle un lote, reportar al final
            print(f"[WARN] Lote {i} falló: {e}")

    return {
        "total_matches": inserted,
        "groups": groups_summary,
    }


@router.get("/probe-columns")
def probe_columns():
    """Detecta qué columnas existen en la tabla matches probando un insert de prueba."""
    teams_res  = supabase.table("teams").select("id").limit(2).execute()
    sports_res = supabase.table("sports").select("id").limit(1).execute()
    cats_res   = supabase.table("categories").select("id").limit(1).execute()

    teams = teams_res.data or []
    if len(teams) < 2:
        raise HTTPException(status_code=400, detail="No hay equipos para la prueba")

    sport_id   = (sports_res.data or [{}])[0].get("id", "")
    cat_id     = (cats_res.data   or [{}])[0].get("id", "")

    base = {
        "team_a":      teams[0]["id"],
        "team_b":      teams[1]["id"],
        "sport_id":    sport_id,
        "category_id": cat_id,
        "match_date":  "2026-03-01T08:00:00-05:00",
        "location":    "Prueba",
        "status":      "scheduled",
    }

    try:
        r = supabase.table("matches").insert(base).execute()
        if r.data:
            inserted_id = r.data[0].get("id")
            cols = list(r.data[0].keys())
            supabase.table("matches").delete().eq("id", inserted_id).execute()
            return {"status": "OK", "columns_in_table": cols}
        return {"status": "FAILED", "detail": "No data returned"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/clear-all", status_code=204)
def clear_all_matches():
    """Elimina todos los partidos de Supabase."""
    try:
        supabase.table("matches").delete().gte("created_at", "2000-01-01").execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error limpiando partidos: {e}")


@router.get("/preview")
def preview_groups():
    """Muestra los grupos que se generarían sin crear partidos."""
    teams_res = supabase.table("teams").select("*").execute()
    sports_res = supabase.table("sports").select("id, name").execute()
    cats_res = supabase.table("categories").select("id, name, gender, sport_id").execute()

    teams_raw = teams_res.data or []
    sports = sports_res.data or []
    categories = cats_res.data or []

    groups: dict[tuple, int] = {}
    for t in teams_raw:
        sport_obj = next((s for s in sports if s["id"] == t.get("sport_id")), {"id": "", "name": ""})
        cat = next((c for c in categories if c["id"] == t.get("category_id")), {"id": "", "name": "General", "gender": "Masculino"})
        key = (sport_obj.get("name", ""), cat.get("name", ""), cat.get("gender", "Masculino"))
        groups[key] = groups.get(key, 0) + 1

    result = []
    total_matches = 0
    for (sport_name, cat_name, gender), count in sorted(groups.items()):
        n = count
        match_count = n * (n - 1) // 2
        total_matches += match_count
        result.append({
            "sport": sport_name,
            "category": cat_name,
            "gender": gender,
            "teams": n,
            "expected_matches": match_count,
        })

    return {"groups": result, "total_expected_matches": total_matches}


@router.get("/config")
def get_sport_config():
    """Devuelve los deportes, categorías y géneros disponibles para programar."""
    sports_res = supabase.table("sports").select("id, name").execute()
    cats_res = supabase.table("categories").select("id, name, gender, sport_id").execute()

    return {
        "sports": sports_res.data or [],
        "categories": cats_res.data or [],
        "genders": ["Masculino", "Femenino", "Mixto"],
    }
