"""
Servicio de generación de calendarios de torneos (round-robin).
Big Games 2026 — implementación completa con canchas, sedes y restricciones.
"""
from __future__ import annotations
from datetime import datetime, timedelta
from typing import Optional


COLOMBIA_TZ = "-05:00"

# ─── Configuración por deporte ────────────────────────────────────────────────
# duration: duración real del partido (min)
# interval: cada cuántos min puede usar la CANCHA un nuevo partido
# rest_min: min que debe descansar un EQUIPO (tras fin de partido) antes del siguiente
# max_consecutive: máx partidos seguidos para voleibol (None = sin límite)

SPORT_CONFIG = {
    "Fútbol": {
        "duration": 57,     # 2×25 min + 7 min descanso
        "interval": 70,
        "rest_min": 60,
        "max_consecutive": None,
    },
    "Fútbol 7": {
        "duration": 57,
        "interval": 70,
        "rest_min": 60,
        "max_consecutive": None,
    },
    "Baloncesto": {
        "duration": 47,     # 4×10 min + 7 min descanso
        "interval": 70,
        "rest_min": 60,
        "max_consecutive": None,
    },
    "Voleibol": {
        "duration": 75,
        "interval": 75,
        "rest_min": 0,
        "max_consecutive": 2,
    },
}


def _get_sport_config(sport: str) -> dict:
    s = sport.lower()
    # Fútbol 7 must be checked before Fútbol
    if "7" in s and ("fútbol" in s or "futbol" in s):
        return SPORT_CONFIG["Fútbol 7"]
    for key, cfg in SPORT_CONFIG.items():
        if s.startswith(key.lower()):
            return cfg
    return {"duration": 60, "interval": 70, "rest_min": 60, "max_consecutive": None}


# ─── Sedes y canchas ──────────────────────────────────────────────────────────
# court_id → (nombre_cancha, nombre_sede)

COURTS: dict = {
    "monomeros_1":      ("Monómeros 1",             "Polideportivo Hernán Celedón Manotas"),
    "monomeros_2":      ("Monómeros 2",             "Polideportivo Hernán Celedón Manotas"),
    "solinilla_1":      ("Solinilla 1",             "Centro Recreacional Solinilla"),
    "solinilla_2":      ("Solinilla 2",             "Centro Recreacional Solinilla"),
    "solinilla_3":      ("Solinilla 3",             "Centro Recreacional Solinilla"),
    "simon_bolivar":    ("U. Simón Bolívar Salgar", "Universidad Simón Bolívar sede Salgar"),
    "british_f11":      ("British 1 Externa F11",   "British International School"),
    "british_f7":       ("British 2 Interna F7",    "British International School"),
    "british_basket_1": ("British Basket 1",        "British International School"),
    "british_basket_2": ("British Basket 2",        "British International School"),
    "marathon_gym":     ("Marathon Gym",            "British International School"),
    "british_sol":      ("British Sol",             "British International School"),
    "british_techo":    ("British Techo",           "British International School"),
    "sugar_1":          ("Sugar 1",                 "Coliseo Sugar Baby Rojas"),
    "sugar_2":          ("Sugar 2",                 "Coliseo Sugar Baby Rojas"),
    "sugar_3":          ("Sugar 3",                 "Coliseo Sugar Baby Rojas"),
}


def _court_location_str(court_id: str) -> str:
    """Retorna 'Nombre Cancha — Nombre Sede' para el campo location."""
    info = COURTS.get(court_id)
    if not info:
        return court_id
    return f"{info[0]} — {info[1]}"


# ─── Ventanas de disponibilidad ───────────────────────────────────────────────
# Tupla: (date_str, open_h, open_m, close_h, close_m)
# REGLA OBLIGATORIA: último partido inicia máximo (close - 60 min)

_W_MONOMEROS = [
    ("2026-03-11",  8,  0, 18, 0),
    ("2026-03-12",  8,  0, 18, 0),
    ("2026-03-13",  8,  0, 18, 0),
    ("2026-03-14",  8,  0, 14, 0),
]

_W_SOLINILLA = [
    ("2026-03-10", 13,  0, 18, 0),  # Martes 10: desde 13:00
    ("2026-03-11",  8,  0, 18, 0),
    ("2026-03-12",  8,  0, 18, 0),
    ("2026-03-13",  8,  0, 18, 0),
    ("2026-03-14",  8,  0, 14, 0),
]

_W_BRITISH_FUTBOL = [
    ("2026-03-11",  8,  0, 18, 0),
    ("2026-03-12",  8,  0, 18, 0),
    ("2026-03-13",  8,  0, 18, 0),
    ("2026-03-14",  8,  0, 14, 0),
]

_W_BASKET = [
    ("2026-03-11",  8,  0, 18, 0),
    ("2026-03-12",  8,  0, 18, 0),
    ("2026-03-13",  8,  0, 18, 0),
    ("2026-03-14",  8,  0, 14, 0),
]

# Voleibol general (categorías 2010-11 y 2012-13)
_W_VOLEIBOL_GENERAL = [
    ("2026-03-06", 13, 30, 18, 0),  # Viernes 6: desde 13:30
    ("2026-03-07",  8,  0, 13, 0),  # Sábado 7: 8:00–13:00
    ("2026-03-09", 15,  0, 18, 0),  # Lunes 9: desde 15:00
    ("2026-03-10", 15,  0, 18, 0),  # Martes 10: desde 15:00
    ("2026-03-11",  8,  0, 18, 0),
    ("2026-03-12",  8,  0, 18, 0),
    ("2026-03-13",  8,  0, 18, 0),
    ("2026-03-14",  8,  0, 14, 0),
]

# Voleibol 2007-09 (masc y fem): DEBE TERMINAR el viernes 13 máximo a las 16:00
# → último inicio máximo 15:00 ese día
_W_VOLEIBOL_0709 = [
    ("2026-03-06", 13, 30, 18, 0),
    ("2026-03-07",  8,  0, 13, 0),
    ("2026-03-09", 15,  0, 18, 0),
    ("2026-03-10", 15,  0, 18, 0),
    ("2026-03-11",  8,  0, 18, 0),
    ("2026-03-12",  8,  0, 18, 0),
    ("2026-03-13",  8,  0, 16, 0),  # ⚠️ close = 16:00 → último inicio 15:00
    ("2026-03-14",  8,  0, 14, 0),
]


# ─── Asignación cancha + ventana por categoría ────────────────────────────────

def _get_courts_and_windows(sport: str, gender: str, cat_name: str):
    """
    Retorna (list[court_id], windows) para la categoría dada.
    Orden importante: reglas más específicas primero.
    """
    s = sport.lower()
    g = gender.lower()

    # ── Fútbol 7 ─────────────────────────────────────────────────────────────
    if "7" in s and ("fútbol" in s or "futbol" in s):
        return ["british_f7"], _W_BRITISH_FUTBOL

    # ── Fútbol (11) ──────────────────────────────────────────────────────────
    if "fútbol" in s or "futbol" in s:
        if g == "masculino":
            if "2007" in cat_name:
                return ["monomeros_1"], _W_MONOMEROS
            elif "2010" in cat_name:
                # Solinilla 1,2,3 — Solinilla 2 se comparte con fem 2010-11
                return ["solinilla_1", "solinilla_2", "solinilla_3"], _W_SOLINILLA
            elif "2012" in cat_name:
                return ["simon_bolivar", "british_f11"], _W_BRITISH_FUTBOL
        elif g == "femenino":
            if "2007" in cat_name:
                return ["monomeros_2"], _W_MONOMEROS
            elif "2010" in cat_name:
                # Solo Solinilla 2 (comparte court con masc 2010-11, el court_state lo maneja)
                return ["solinilla_2"], _W_SOLINILLA
            elif "2012" in cat_name:
                return ["british_f7"], _W_BRITISH_FUTBOL

    # ── Baloncesto ───────────────────────────────────────────────────────────
    if "baloncesto" in s:
        return ["british_basket_1", "british_basket_2"], _W_BASKET

    # ── Voleibol ─────────────────────────────────────────────────────────────
    if "voleibol" in s:
        is_0709 = "2007" in cat_name
        windows = _W_VOLEIBOL_0709 if is_0709 else _W_VOLEIBOL_GENERAL

        if "2012" in cat_name:
            # Voleibol fem 2012-13: Marathon + British Techo
            return ["marathon_gym", "british_techo"], windows
        else:
            # Voleibol 2007-09 y 2010-11: Marathon, British Sol, Sugar 1,2,3
            return ["marathon_gym", "british_sol", "sugar_1", "sugar_2", "sugar_3"], windows

    return [], []


# ─── Slots de disponibilidad ──────────────────────────────────────────────────

def _build_day_slots(windows: list) -> list:
    """
    Convierte tuplas de ventana en (datetime_open, datetime_last_start).
    last_start = close - 60 min (regla obligatoria: último inicio ≥ 1h antes del cierre).
    """
    slots = []
    for date_str, oh, om, ch, cm in windows:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        open_dt   = dt.replace(hour=oh, minute=om)
        close_dt  = dt.replace(hour=ch, minute=cm)
        last_start = close_dt - timedelta(minutes=60)
        if last_start >= open_dt:
            slots.append((open_dt, last_start))
    slots.sort(key=lambda x: x[0])
    return slots


def _snap_to_availability(dt: datetime, day_slots: list) -> Optional[datetime]:
    """
    Retorna el primer inicio válido >= dt dentro de las ventanas.
    None si no hay slots disponibles.
    """
    for open_dt, last_start in day_slots:
        if dt <= last_start:
            return max(dt, open_dt)
    return None


# ─── Función principal ────────────────────────────────────────────────────────

def generate_tournament_schedule(
    teams: list,
    rule: dict,
    court_state: Optional[dict] = None,
) -> list:
    """
    Genera partidos round-robin para UN grupo (sport + category + gender).

    court_state: dict compartido entre categorías para evitar doble-reserva.
                 { court_id: datetime_next_free }
    """
    sport    = rule.get("sport", "")
    category = rule.get("category", "")
    gender   = rule.get("gender", "")

    filtered_teams = [
        t for t in teams
        if _team_sport(t) == sport
        and _team_category(t) == category
        and _team_gender(t) == gender
    ]
    if len(filtered_teams) < 2:
        return []

    # IDs de FK para el insert en Supabase
    _sp  = filtered_teams[0].get("sport", {})
    _cat = filtered_teams[0].get("category", {})
    sport_id    = _sp.get("id", "")  if isinstance(_sp, dict)  else ""
    category_id = _cat.get("id", "") if isinstance(_cat, dict) else ""

    cfg         = _get_sport_config(sport)
    duration    = rule.get("match_duration_minutes") or cfg["duration"]
    rest_min    = rule.get("rest_between_matches_minutes") or cfg["rest_min"]
    interval    = cfg["interval"]
    max_consec  = cfg["max_consecutive"]

    # Canchas y ventanas
    courts_override = rule.get("courts", [])
    if courts_override:
        court_ids = courts_override
        _, windows = _get_courts_and_windows(sport, gender, category)
    else:
        court_ids, windows = _get_courts_and_windows(sport, gender, category)

    if not court_ids or not windows:
        return []

    day_slots = _build_day_slots(windows)
    if not day_slots:
        return []

    first_available = day_slots[0][0]

    if court_state is None:
        court_state = {}
    for c in court_ids:
        if c not in court_state:
            court_state[c] = first_available

    matches: list = []

    # Cuándo puede jugar cada equipo de nuevo (respeta descanso)
    team_next_avail: dict = {}
    # Para voleibol: cuántos partidos consecutivos lleva cada equipo
    team_consec: dict = {}
    team_last_start: dict = {}

    n = len(filtered_teams)
    pairs = [
        (filtered_teams[i], filtered_teams[j])
        for i in range(n) for j in range(i + 1, n)
    ]

    court_robin = 0  # rotación de canchas

    for t1, t2 in pairs:
        best_court = None
        best_time  = None
        best_ci    = 0

        # Hora mínima en que ambos equipos pueden jugar
        team_earliest = max(
            team_next_avail.get(t1["id"], first_available),
            team_next_avail.get(t2["id"], first_available),
        )

        for ci in range(len(court_ids)):
            court     = court_ids[(court_robin + ci) % len(court_ids)]
            court_free = court_state.get(court, first_available)

            candidate = max(team_earliest, court_free)
            snapped   = _snap_to_availability(candidate, day_slots)
            if snapped is None:
                continue

            if best_time is None or snapped < best_time:
                best_time  = snapped
                best_court = court
                best_ci    = ci

        if best_court is None or best_time is None:
            # Sin slots disponibles → partido sin asignar (no se agrega)
            continue

        # Registrar ocupación de cancha
        court_robin = (court_robin + best_ci + 1) % len(court_ids)
        court_state[best_court] = best_time + timedelta(minutes=interval)

        # Actualizar disponibilidad de cada equipo
        for tid in (t1["id"], t2["id"]):
            if max_consec is not None:
                # Voleibol: tracking de consecutivos
                prev_last = team_last_start.get(tid)
                if prev_last is not None and (best_time - prev_last) <= timedelta(minutes=interval + 10):
                    # Están jugando consecutivamente
                    new_consec = team_consec.get(tid, 0) + 1
                else:
                    # Hubo pausa → reset
                    new_consec = 1

                team_consec[tid]     = new_consec
                team_last_start[tid] = best_time

                if new_consec >= max_consec:
                    # Forzar descanso de al menos un slot
                    team_next_avail[tid] = best_time + timedelta(minutes=interval + 1)
                    team_consec[tid]     = 0  # reset para los siguientes
                else:
                    team_next_avail[tid] = best_time + timedelta(minutes=interval)
            else:
                # Fútbol / Baloncesto: descanso mínimo = duración + rest_min
                team_next_avail[tid] = best_time + timedelta(minutes=duration + rest_min)
                team_last_start[tid] = best_time

        match = {
            "team_a":      t1["id"],
            "team_b":      t2["id"],
            "sport_id":    sport_id,
            "category_id": category_id,
            "match_date":  best_time.strftime("%Y-%m-%dT%H:%M:00") + COLOMBIA_TZ,
            "location":    _court_location_str(best_court),
            "status":      "pending",
        }
        matches.append(match)

    return matches


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _team_sport(team: dict) -> str:
    s = team.get("sport", {})
    return s.get("name", "") if isinstance(s, dict) else str(s)

def _team_category(team: dict) -> str:
    c = team.get("category", {})
    return c.get("name", "") if isinstance(c, dict) else str(c)

def _team_gender(team: dict) -> str:
    c = team.get("category", {})
    if isinstance(c, dict):
        return c.get("gender", "")
    return team.get("gender", "")
