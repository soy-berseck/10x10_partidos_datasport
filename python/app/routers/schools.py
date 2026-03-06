from fastapi import APIRouter, HTTPException
from app.database import supabase
from app.models import School, SchoolCreate

router = APIRouter(prefix="/api/schools", tags=["schools"])


@router.get("/", response_model=list[dict])
def get_schools():
    res = supabase.table("schools").select("id, name, logo_url").execute()
    return res.data or []


@router.get("/{school_id}")
def get_school(school_id: str):
    res = supabase.table("schools").select("id, name, logo_url").eq("id", school_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Colegio no encontrado")
    return res.data


@router.post("/", status_code=201)
def create_school(school: SchoolCreate):
    res = supabase.table("schools").insert(school.model_dump(exclude_none=True)).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Error al crear colegio")
    return res.data[0]


@router.put("/{school_id}")
def update_school(school_id: str, school: SchoolCreate):
    res = supabase.table("schools").update(school.model_dump(exclude_none=True)).eq("id", school_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Colegio no encontrado")
    return res.data[0]


@router.delete("/{school_id}")
def delete_school(school_id: str):
    """Elimina un colegio y todos sus equipos, jugadores, partidos y medallas."""
    # Get all teams for this school
    teams_res = supabase.table("teams").select("id").eq("school_id", school_id).execute()
    team_ids = [t["id"] for t in (teams_res.data or [])]

    if team_ids:
        # Delete match_events for matches involving these teams
        for tid in team_ids:
            matches_a = supabase.table("matches").select("id").eq("team_a", tid).execute()
            matches_b = supabase.table("matches").select("id").eq("team_b", tid).execute()
            match_ids = [m["id"] for m in (matches_a.data or []) + (matches_b.data or [])]
            for mid in match_ids:
                supabase.table("match_events").delete().eq("match_id", mid).execute()

        # Delete matches involving these teams
        for tid in team_ids:
            supabase.table("matches").delete().eq("team_a", tid).execute()
            supabase.table("matches").delete().eq("team_b", tid).execute()

        # Delete players from these teams
        for tid in team_ids:
            supabase.table("players").delete().eq("team_id", tid).execute()

        # Delete teams
        supabase.table("teams").delete().eq("school_id", school_id).execute()

    # Delete individual medals for this school
    supabase.table("individual_medals").delete().eq("school_id", school_id).execute()

    # Delete the school
    supabase.table("schools").delete().eq("id", school_id).execute()
    return {"deleted": school_id}
