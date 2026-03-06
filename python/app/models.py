from pydantic import BaseModel, Field
from typing import Optional, Any
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class Sport(str, Enum):
    FUTBOL = "Fútbol"
    BALONCESTO = "Baloncesto"
    VOLEIBOL = "Voleibol"
    NATACION = "Natación"
    TENIS = "Tenis"
    PADEL = "Pádel"
    SOFTBOL = "Softbol"
    AJEDREZ = "Ajedrez"
    GIMNASIA = "Gimnasia"
    GOLF = "Golf"
    EQUITACION = "Equitación"


class Gender(str, Enum):
    MASCULINO = "Masculino"
    FEMENINO = "Femenino"
    MIXTO = "Mixto"


class MatchStatus(str, Enum):
    PROGRAMADO = "Programado"
    EN_VIVO = "En Vivo"
    FINALIZADO = "Finalizado"


class EventType(str, Enum):
    # Football
    GOL = "Gol"
    ASISTENCIA_FUTBOL = "Asistencia (Fútbol)"
    TARJETA_AMARILLA = "Tarjeta Amarilla"
    TARJETA_ROJA = "Tarjeta Roja"
    SUSTITUCION_FUTBOL = "Sustitución (Fútbol)"
    PENAL = "Penal"
    # Basketball
    CANASTA_1PT = "Canasta 1pt"
    CANASTA_2PTS = "Canasta 2pts"
    CANASTA_3PTS = "Canasta 3pts"
    ASISTENCIA_BALONCESTO = "Asistencia (Baloncesto)"
    SUSTITUCION_BALONCESTO = "Sustitución (Baloncesto)"
    FALTA_PERSONAL = "Falta Personal"
    FALTA_TECNICA = "Falta Técnica"
    # Volleyball
    PUNTO_VOLEIBOL = "Punto (Voleibol)"
    ACE = "Ace (Saque Directo)"
    BLOQUEO = "Bloqueo"
    SUSTITUCION_VOLEIBOL = "Sustitución (Voleibol)"
    ERROR_VOLEIBOL = "Error (Voleibol)"
    # Swimming
    REGISTRAR_TIEMPO = "Registrar Tiempo"
    POSICION_FINAL_NATACION = "Posición Final (Natación)"
    # Tennis / Padel
    PUNTO_TENIS_PADEL = "Punto (Tenis/Pádel)"
    ACE_TENIS_PADEL = "Ace (Tenis/Pádel)"
    GAME_GANADO = "Game Ganado"
    SET_GANADO = "Set Ganado"


# ─── Status/EventType Mappers ─────────────────────────────────────────────────

SUPABASE_TO_MATCH_STATUS = {
    "scheduled": MatchStatus.PROGRAMADO,
    "live": MatchStatus.EN_VIVO,
    "finished": MatchStatus.FINALIZADO,
}

MATCH_STATUS_TO_SUPABASE = {v: k for k, v in SUPABASE_TO_MATCH_STATUS.items()}

SUPABASE_TO_EVENT_TYPE = {
    "goal": EventType.GOL,
    "assist_football": EventType.ASISTENCIA_FUTBOL,
    "yellow_card": EventType.TARJETA_AMARILLA,
    "red_card": EventType.TARJETA_ROJA,
    "substitution_football": EventType.SUSTITUCION_FUTBOL,
    "penalty": EventType.PENAL,
    "basket_1pt": EventType.CANASTA_1PT,
    "basket_2pts": EventType.CANASTA_2PTS,
    "basket_3pts": EventType.CANASTA_3PTS,
    "assist_basketball": EventType.ASISTENCIA_BALONCESTO,
    "substitution_basketball": EventType.SUSTITUCION_BALONCESTO,
    "personal_foul": EventType.FALTA_PERSONAL,
    "technical_foul": EventType.FALTA_TECNICA,
    "point_volleyball": EventType.PUNTO_VOLEIBOL,
    "ace": EventType.ACE,
    "block": EventType.BLOQUEO,
    "substitution_volleyball": EventType.SUSTITUCION_VOLEIBOL,
    "error_volleyball": EventType.ERROR_VOLEIBOL,
    "register_time": EventType.REGISTRAR_TIEMPO,
    "final_position_swimming": EventType.POSICION_FINAL_NATACION,
    "point_tennis_padel": EventType.PUNTO_TENIS_PADEL,
    "ace_tennis_padel": EventType.ACE_TENIS_PADEL,
    "game_won": EventType.GAME_GANADO,
    "set_won": EventType.SET_GANADO,
}

EVENT_TYPE_TO_SUPABASE = {v: k for k, v in SUPABASE_TO_EVENT_TYPE.items()}


# ─── Pydantic Models ───────────────────────────────────────────────────────────

class SchoolBase(BaseModel):
    name: str
    logo_url: Optional[str] = None

class SchoolCreate(SchoolBase):
    pass

class School(SchoolBase):
    id: str

    class Config:
        from_attributes = True


class SportModel(BaseModel):
    id: str
    name: str


class CategoryModel(BaseModel):
    id: str
    name: str
    gender: Gender
    sport_id: str


class TeamBase(BaseModel):
    name: str
    school_id: str
    sport_id: str
    category_id: str

class TeamCreate(TeamBase):
    pass

class Team(BaseModel):
    id: str
    name: str
    school: School
    sport: SportModel
    category: CategoryModel
    gender: Gender

    class Config:
        from_attributes = True


class PlayerBase(BaseModel):
    full_name: str
    jersey_number: Optional[int] = None
    team_id: str
    photo_url: Optional[str] = None

class PlayerCreate(PlayerBase):
    pass

class PlayerUpdate(BaseModel):
    full_name: Optional[str] = None
    jersey_number: Optional[int] = None
    team_id: Optional[str] = None
    photo_url: Optional[str] = None

class Player(PlayerBase):
    id: str

    class Config:
        from_attributes = True


class MatchSchoolInfo(BaseModel):
    id: str
    name: str
    logo_url: Optional[str] = None

class MatchTeamInfo(BaseModel):
    school: MatchSchoolInfo

class MatchBase(BaseModel):
    sport_id: str
    category_id: str
    team_a: str
    team_b: str
    match_date: Optional[str] = None
    location: Optional[str] = None
    status: str = "pending"
    group_name: Optional[str] = None
    phase: Optional[str] = None

class MatchCreate(MatchBase):
    pass

class MatchUpdate(BaseModel):
    status: Optional[str] = None
    match_date: Optional[str] = None
    location: Optional[str] = None
    team1_score: Optional[int] = None
    team2_score: Optional[int] = None

class Match(MatchBase):
    id: str
    team1: Optional[MatchTeamInfo] = None
    team2: Optional[MatchTeamInfo] = None

    class Config:
        from_attributes = True


class EventBase(BaseModel):
    match_id: str
    event_type: str
    player_id: Optional[str] = None
    team_id: str
    minute: int
    details: Optional[dict[str, Any]] = None

class EventCreate(EventBase):
    pass

class Event(EventBase):
    id: str

    class Config:
        from_attributes = True


class SchedulingRuleCreate(BaseModel):
    sport: str
    category: str
    gender: str
    group_count: int = 1
    teams_per_group: int = 4
    matches_per_team_in_group: int = 3
    match_duration_minutes: int = 60
    rest_between_matches_minutes: int = 60
    start_date: str
    courts: list[str] = []
    notes: Optional[str] = None


class PlayerStatsResponse(BaseModel):
    player_id: str
    name: str
    team_name: str
    school: str
    photo: str
    yellow_cards: int = 0
    red_cards: int = 0
    total_cards: int = 0
    matches_played: int = 0
    sport_stats: list[dict] = []


class TeamStatsResponse(BaseModel):
    team_id: str
    team_name: str
    school: str
    sport: str
    category: str
    gender: str
    matches_played: int = 0
    wins: int = 0
    draws: int = 0
    losses: int = 0
    goals_for: int = 0
    goals_against: int = 0
    goal_difference: int = 0
    points: int = 0
