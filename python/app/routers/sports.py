from fastapi import APIRouter, HTTPException
from app.database import supabase

router = APIRouter(prefix="/api/sports", tags=["sports"])


@router.get("/", response_model=list[dict])
def get_sports():
    res = supabase.table("sports").select("id, name").execute()
    return res.data or []


@router.get("/{sport_id}")
def get_sport(sport_id: str):
    res = supabase.table("sports").select("id, name").eq("id", sport_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Deporte no encontrado")
    return res.data
