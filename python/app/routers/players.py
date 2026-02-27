from fastapi import APIRouter, HTTPException, UploadFile, File
from app.database import supabase
from app.models import PlayerCreate, PlayerUpdate
import openpyxl
import io

router = APIRouter(prefix="/api/players", tags=["players"])


PLACEHOLDER_PHOTO = "https://ui-avatars.com/api/?background=1e40af&color=fff&size=60&name="

def _add_defaults(player: dict) -> dict:
    """Agrega campos que no existen en la DB pero usa el frontend."""
    return {
        **player,
        "photo_url": player.get("photo_url") or f"{PLACEHOLDER_PHOTO}{player.get('full_name','?').replace(' ', '+')}",
    }


@router.get("/", response_model=list[dict])
def get_players(team_id: str = None):
    query = supabase.table("players").select("*")
    if team_id:
        query = query.eq("team_id", team_id)
    res = query.execute()
    return [_add_defaults(p) for p in (res.data or [])]


@router.get("/{player_id}")
def get_player(player_id: str):
    res = supabase.table("players").select("*").eq("id", player_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    return _add_defaults(res.data)


@router.post("/", status_code=201)
def create_player(player: PlayerCreate):
    data = player.model_dump(exclude_none=True)
    try:
        res = supabase.table("players").insert(data).select().execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al crear jugador: {str(e)}")
    if not res.data:
        raise HTTPException(status_code=400, detail="Error al crear jugador")
    return res.data[0]


@router.put("/{player_id}")
def update_player(player_id: str, player: PlayerUpdate):
    data = player.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    try:
        supabase.table("players").update(data).eq("id", player_id).execute()
        res = supabase.table("players").select("*").eq("id", player_id).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al actualizar jugador: {str(e)}")
    if not res.data:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    return res.data[0]


@router.delete("/{player_id}", status_code=204)
def delete_player(player_id: str):
    supabase.table("players").delete().eq("id", player_id).execute()


@router.post("/import-excel", status_code=201)
async def import_players_excel(file: UploadFile = File(...)):
    """
    Importa jugadores desde un archivo Excel.
    Columnas esperadas: full_name, jersey_number, team_id
    """
    contents = await file.read()
    wb = openpyxl.load_workbook(io.BytesIO(contents))
    ws = wb.active

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        raise HTTPException(status_code=400, detail="Archivo vacío")

    headers = [str(h).strip().lower() if h else "" for h in rows[0]]
    created = []
    errors = []

    for i, row in enumerate(rows[1:], start=2):
        row_dict = dict(zip(headers, row))
        full_name = str(row_dict.get("full_name", row_dict.get("nombre", ""))).strip()
        team_id = str(row_dict.get("team_id", "")).strip()

        if not full_name or not team_id:
            errors.append(f"Fila {i}: nombre o team_id vacío")
            continue

        jersey_raw = row_dict.get("jersey_number", row_dict.get("numero", None))
        jersey = int(jersey_raw) if jersey_raw is not None else None

        payload = {"full_name": full_name, "team_id": team_id}
        if jersey is not None:
            payload["jersey_number"] = jersey

        res = supabase.table("players").insert(payload).execute()
        if res.data:
            created.append(res.data[0])
        else:
            errors.append(f"Fila {i}: error al insertar {full_name}")

    return {"created": len(created), "errors": errors}
