from fastapi import APIRouter, HTTPException
from app.database import supabase

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("/", response_model=list[dict])
def get_categories(sport_id: str = None):
    query = supabase.table("categories").select("id, name, gender, sport_id")
    if sport_id:
        query = query.eq("sport_id", sport_id)
    res = query.execute()
    return res.data or []


@router.get("/{category_id}")
def get_category(category_id: str):
    res = supabase.table("categories").select("id, name, gender, sport_id").eq("id", category_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return res.data
