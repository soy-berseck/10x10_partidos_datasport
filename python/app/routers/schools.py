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


@router.delete("/{school_id}", status_code=204)
def delete_school(school_id: str):
    supabase.table("schools").delete().eq("id", school_id).execute()
