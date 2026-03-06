import uuid
from fastapi import APIRouter, HTTPException, File, UploadFile
from pydantic import BaseModel
from typing import Optional
from app.database import supabase

router = APIRouter(prefix="/api/posts", tags=["posts"])


class PostCreate(BaseModel):
    content: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None


class ReactionToggle(BaseModel):
    session_id: str
    reaction_type: str


class CommentCreate(BaseModel):
    author_name: Optional[str] = ''
    content: str
    session_id: str


@router.get("/", response_model=list[dict])
def get_posts():
    res = (
        supabase.table("posts")
        .select("*, post_reactions(reaction_type, session_id), post_comments(id, author_name, content, session_id, created_at)")
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return res.data or []


@router.post("/", status_code=201)
def create_post(post: PostCreate):
    data = post.model_dump(exclude_none=True)

    # Auto-detectar tipo de media por URL si no se especificó
    if data.get("media_url") and not data.get("media_type"):
        url = data["media_url"].lower()
        if "youtube.com" in url or "youtu.be" in url:
            data["media_type"] = "youtube"
        elif any(url.split("?")[0].endswith(ext) for ext in [".mp4", ".webm", ".mov", ".avi"]):
            data["media_type"] = "video"
        else:
            data["media_type"] = "image"

    try:
        supabase.table("posts").insert(data).execute()
        res = supabase.table("posts").select("*").order("created_at", desc=True).limit(1).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al crear publicación: {str(e)}")

    if not res.data:
        raise HTTPException(status_code=400, detail="Error al crear publicación")
    return res.data[0]


@router.post("/upload")
async def upload_media(file: UploadFile = File(...)):
    """Sube un archivo a Supabase Storage y devuelve la URL pública."""
    ALLOWED_IMAGES = {"jpg", "jpeg", "png", "gif", "webp", "heic", "heif"}
    ALLOWED_VIDEOS = {"mp4", "mov", "webm", "avi", "m4v"}
    MAX_SIZE = 80 * 1024 * 1024  # 80 MB

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="Archivo muy grande (máx. 80 MB)")

    original_name = file.filename or "media"
    ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
    if ext not in ALLOWED_IMAGES | ALLOWED_VIDEOS:
        ext = "jpg"  # fallback

    media_type = "video" if ext in ALLOWED_VIDEOS else "image"
    content_type = file.content_type or ("video/mp4" if media_type == "video" else "image/jpeg")
    file_name = f"{uuid.uuid4()}.{ext}"

    try:
        supabase.storage.from_("posts_media").upload(
            file_name, content, {"content-type": content_type}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al subir archivo: {str(e)}")

    url = supabase.storage.from_("posts_media").get_public_url(file_name)
    return {"url": url, "media_type": media_type}


@router.post("/{post_id}/reactions")
def toggle_reaction(post_id: str, body: ReactionToggle):
    existing = supabase.table("post_reactions").select("id") \
        .eq("post_id", post_id) \
        .eq("session_id", body.session_id) \
        .eq("reaction_type", body.reaction_type) \
        .execute()
    if existing.data:
        supabase.table("post_reactions").delete().eq("id", existing.data[0]["id"]).execute()
        return {"action": "removed"}
    supabase.table("post_reactions").insert({
        "post_id": post_id,
        "session_id": body.session_id,
        "reaction_type": body.reaction_type,
    }).execute()
    return {"action": "added"}


@router.delete("/{post_id}", status_code=204)
def delete_post(post_id: str):
    supabase.table("posts").delete().eq("id", post_id).execute()


@router.get("/{post_id}/comments", response_model=list[dict])
def get_comments(post_id: str):
    res = (
        supabase.table("post_comments")
        .select("*")
        .eq("post_id", post_id)
        .order("created_at")
        .execute()
    )
    return res.data or []


@router.post("/{post_id}/comments", status_code=201)
def add_comment(post_id: str, body: CommentCreate):
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="El comentario no puede estar vacío")
    data = {
        "post_id":     post_id,
        "author_name": (body.author_name or '').strip(),
        "content":     body.content.strip(),
        "session_id":  body.session_id,
    }
    res = supabase.table("post_comments").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Error al guardar comentario")
    return res.data[0]


@router.delete("/{post_id}/comments/{comment_id}", status_code=204)
def delete_comment(post_id: str, comment_id: str):
    supabase.table("post_comments").delete().eq("id", comment_id).eq("post_id", post_id).execute()
