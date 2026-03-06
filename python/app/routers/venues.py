from fastapi import APIRouter, HTTPException
from app.database import supabase
from pydantic import BaseModel
from typing import Optional


class VenueCreate(BaseModel):
    name: str
    description: Optional[str] = None


router = APIRouter(prefix="/api/venues", tags=["venues"])


@router.get("/", response_model=list[dict])
def get_venues():
    res = supabase.table("venues").select("*").order("name").execute()
    return res.data or []


@router.post("/", status_code=201)
def create_venue(venue: VenueCreate):
    res = supabase.table("venues").insert(venue.model_dump(exclude_none=True)).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Error al crear escenario")
    return res.data[0]


@router.delete("/{venue_id}")
def delete_venue(venue_id: str):
    supabase.table("venues").delete().eq("id", venue_id).execute()
    return {"deleted": venue_id}
