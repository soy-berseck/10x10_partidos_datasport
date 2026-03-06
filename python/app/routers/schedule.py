from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import supabase
from app.models import SchedulingRuleCreate
from app.services.scheduling import (
    generate_tournament_schedule,
    _get_group_config,
)

router = APIRouter(prefix="/api/schedule", tags=["schedule"])


class GenerateAllRequest(BaseModel):
    start_date: Optional[str] = None
    courts: list[str] = []
    match_duration_minutes: Optional[int] = None
    rest_between_matches_minutes: Optional[int] = None
    clear_existing: bool = False


@router.post("/generate")
def generate_schedule(rule: SchedulingRuleCreate):
    """Genera un calendario round-robin y lo guarda en Supabase."""
    teams_res   = supabase.table("teams").select("*").execute()
    schools_res = supabase.table("schools").select("id, name, logo_url").execute()
    sports_res  = supabase.table("sports").select("id, name").execute()
    cats_res    = supabase.table("categories").select("id, name, gender, sport_id").execute()

    teams_raw  = teams_res.data or []
    schools    = schools_res.data or []
    sports     = sports_res.data or []
    categories = cats_res.data or []

    teams = []
    for t in teams_raw:
        school    = next((s for s in schools    if s["id"] == t.get("school_id")),   {"id": "", "name": "Desconocido"})
        sport_obj = next((s for s in sports     if s["id"] == t.get("sport_id")),    {"id": "", "name": ""})
        cat       = next((c for c in categories if c["id"] == t.get("category_id")), {"id": "", "name": "General", "gender": "Masculino", "sport_id": ""})
        teams.append({**t, "school": school, "sport": sport_obj, "category": cat, "gender": cat.get("gender", "Masculino")})

    matches = generate_tournament_schedule(teams, rule.model_dump())

    if not matches:
        raise HTTPException(
            status_code=400,
            detail=f"No se encontraron equipos suficientes para {rule.sport} / {rule.category} / {rule.gender}"
        )

    res = supabase.table("matches").insert(matches).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Error al guardar partidos")

    return {"generated": len(res.data), "matches": res.data}


@router.post("/generate-all")
def generate_all_matches(req: GenerateAllRequest):
    """Genera el torneo completo con grupos A/B e intergrupos por categoría."""
    import traceback
    try:
        # ── 1. Leer datos base ────────────────────────────────────────────────
        teams_res   = supabase.table("teams").select("*").execute()
        schools_res = supabase.table("schools").select("id, name, logo_url").execute()
        sports_res  = supabase.table("sports").select("id, name").execute()
        cats_res    = supabase.table("categories").select("id, name, gender, sport_id").execute()

        teams_raw  = teams_res.data  or []
        schools    = schools_res.data or []
        sports     = sports_res.data  or []
        categories = cats_res.data   or []

        # ── 2. Enriquecer equipos ─────────────────────────────────────────────
        teams = []
        for t in teams_raw:
            school    = next((s for s in schools    if s["id"] == t.get("school_id")),   {"id": "", "name": "Desconocido"})
            sport_obj = next((s for s in sports     if s["id"] == t.get("sport_id")),    {"id": "", "name": ""})
            cat       = next((c for c in categories if c["id"] == t.get("category_id")), {"id": "", "name": "General", "gender": "Masculino", "sport_id": ""})
            teams.append({**t, "school": school, "sport": sport_obj, "category": cat, "gender": cat.get("gender", "Masculino")})

        # ── 3. Agrupar por (deporte, categoría, género) ───────────────────────
        groups: dict = {}
        for team in teams:
            sport_obj2 = team.get("sport", {})
            cat_obj2   = team.get("category", {})
            sport_name = sport_obj2.get("name", "") if isinstance(sport_obj2, dict) else ""
            cat_name   = cat_obj2.get("name", "")   if isinstance(cat_obj2, dict)   else ""
            gender     = cat_obj2.get("gender", team.get("gender", "Masculino")) if isinstance(cat_obj2, dict) else team.get("gender", "Masculino")
            key = (sport_name, cat_name, gender)
            groups.setdefault(key, []).append(team)

        # ── 4. Limpiar partidos previos si se solicita ────────────────────────
        if req.clear_existing:
            supabase.table("matches").delete().gte("created_at", "2000-01-01").execute()

        # ── 5. Generar fixture ────────────────────────────────────────────────
        all_matches:    list = []
        groups_summary: list = []
        court_state:    dict = {}

        for (sport_name, cat_name, gender), group_teams in groups.items():
            if len(group_teams) < 2:
                continue

            rule = {
                "sport":    sport_name,
                "category": cat_name,
                "gender":   gender,
                "courts":   req.courts,
                "start_date": req.start_date,
                "match_duration_minutes":      req.match_duration_minutes,
                "rest_between_matches_minutes": req.rest_between_matches_minutes,
            }
            matches = generate_tournament_schedule(group_teams, rule, court_state)
            all_matches.extend(matches)

            cfg       = _get_group_config(sport_name, cat_name, gender)
            ng        = cfg["num_groups"]
            intra_cnt = sum(1 for m in matches if m.get("phase") == "group")
            inter_cnt = sum(1 for m in matches if m.get("phase") == "intergroup")

            groups_summary.append({
                "sport":         sport_name,
                "category":      cat_name,
                "gender":        gender,
                "teams":         len(group_teams),
                "num_groups":    ng,
                "matches":       len(matches),
                "intra_matches": intra_cnt,
                "inter_matches": inter_cnt,
            })

        if not all_matches:
            raise HTTPException(status_code=400, detail="No se encontraron grupos con suficientes equipos")

        # ── 6. Insertar — con fallback si faltan columnas group_name/phase ────
        _columns_missing = False
        test_batch = [all_matches[0]]
        try:
            test_res = supabase.table("matches").insert(test_batch).execute()
        except Exception as e:
            err_str = str(e)
            if "group_name" in err_str or "phase" in err_str or "PGRST204" in err_str:
                _columns_missing = True
                for m in all_matches:
                    m.pop("group_name", None)
                    m.pop("phase", None)
                try:
                    test_res = supabase.table("matches").insert([all_matches[0]]).execute()
                except Exception as e2:
                    raise HTTPException(status_code=500, detail=f"Error al insertar en Supabase: {str(e2)}")
            else:
                raise HTTPException(status_code=500, detail=f"Error al insertar en Supabase: {err_str}")

        if not test_res.data:
            raise HTTPException(status_code=500, detail="Supabase rechazó el insert. Verifica las columnas de la tabla matches.")

        if _columns_missing:
            print("[WARN] Columnas group_name/phase no existen — insertando sin ellas.")

        inserted = len(test_res.data)
        for i in range(1, len(all_matches), 100):
            batch = all_matches[i:i + 100]
            try:
                res = supabase.table("matches").insert(batch).execute()
                if res.data:
                    inserted += len(res.data)
            except Exception as e:
                print(f"[WARN] Lote {i} falló: {e}")

        # ── 7. Respuesta ──────────────────────────────────────────────────────
        total_intra = sum(g["intra_matches"] for g in groups_summary)
        total_inter = sum(g["inter_matches"] for g in groups_summary)

        result = {
            "total_matches": inserted,
            "intra_matches": total_intra,
            "inter_matches": total_inter,
            "groups": groups_summary,
        }
        if _columns_missing:
            result["warning"] = (
                "Las columnas group_name/phase no existen en la tabla matches. "
                "Los partidos se generaron sin esas columnas. "
                "Ejecuta en Supabase: ALTER TABLE matches ADD COLUMN IF NOT EXISTS group_name text; "
                "ALTER TABLE matches ADD COLUMN IF NOT EXISTS phase text DEFAULT 'group';"
            )
        return result

    except HTTPException:
        raise
    except Exception as exc:
        tb = traceback.format_exc()
        print(f"[ERROR] generate_all_matches: {tb}")
        raise HTTPException(status_code=500, detail=f"Error interno al generar torneo: {str(exc)}")


@router.get("/probe-columns")
def probe_columns():
    """Detecta qué columnas existen en la tabla matches."""
    teams_res  = supabase.table("teams").select("id").limit(2).execute()
    sports_res = supabase.table("sports").select("id").limit(1).execute()
    cats_res   = supabase.table("categories").select("id").limit(1).execute()

    teams = teams_res.data or []
    if len(teams) < 2:
        raise HTTPException(status_code=400, detail="No hay equipos para la prueba")

    sport_id = (sports_res.data or [{}])[0].get("id", "")
    cat_id   = (cats_res.data   or [{}])[0].get("id", "")

    base = {
        "team_a":      teams[0]["id"],
        "team_b":      teams[1]["id"],
        "sport_id":    sport_id,
        "category_id": cat_id,
        "match_date":  "2026-03-01T08:00:00-05:00",
        "location":    "Prueba",
        "status":      "scheduled",
        "group_name":  "A",
        "phase":       "group",
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
    """Muestra los grupos que se generarían, con desglose intra/intergrupo."""
    teams_res  = supabase.table("teams").select("*").execute()
    sports_res = supabase.table("sports").select("id, name").execute()
    cats_res   = supabase.table("categories").select("id, name, gender, sport_id").execute()

    teams_raw  = teams_res.data or []
    sports     = sports_res.data or []
    categories = cats_res.data or []

    groups: dict[tuple, int] = {}
    for t in teams_raw:
        sport_obj = next((s for s in sports     if s["id"] == t.get("sport_id")),    {"id": "", "name": ""})
        cat       = next((c for c in categories if c["id"] == t.get("category_id")), {"id": "", "name": "General", "gender": "Masculino"})
        key = (sport_obj.get("name", ""), cat.get("name", ""), cat.get("gender", "Masculino"))
        groups[key] = groups.get(key, 0) + 1

    result       = []
    total_intra  = 0
    total_inter  = 0

    for (sport_name, cat_name, gender), count in sorted(groups.items()):
        cfg      = _get_group_config(sport_name, cat_name, gender)
        ng       = cfg["num_groups"]
        ig_pt    = cfg["intergroup_per_team"]
        per_grp  = count // ng if ng > 0 else count
        intra    = (per_grp * (per_grp - 1) // 2) * ng
        inter    = per_grp * ig_pt if ng >= 2 and ig_pt > 0 else 0
        total    = intra + inter

        total_intra += intra
        total_inter += inter

        result.append({
            "sport":             sport_name,
            "category":          cat_name,
            "gender":            gender,
            "teams":             count,
            "num_groups":        ng,
            "teams_per_group":   per_grp,
            "intra_matches":     intra,
            "inter_matches":     inter,
            "expected_matches":  total,
        })

    return {
        "groups": result,
        "total_intra_matches":    total_intra,
        "total_inter_matches":    total_inter,
        "total_expected_matches": total_intra + total_inter,
    }


@router.get("/config")
def get_sport_config():
    """Devuelve los deportes, categorías y géneros disponibles."""
    sports_res = supabase.table("sports").select("id, name").execute()
    cats_res   = supabase.table("categories").select("id, name, gender, sport_id").execute()

    return {
        "sports":     sports_res.data or [],
        "categories": cats_res.data or [],
        "genders":    ["Masculino", "Femenino", "Mixto"],
    }
