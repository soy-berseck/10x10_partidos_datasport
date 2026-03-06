"""
Servicio de generación de calendarios de torneos (round-robin con grupos).
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
        "interval": 55,
        "rest_min": 0,
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
    if "7" in s and ("fútbol" in s or "futbol" in s):
        return SPORT_CONFIG["Fútbol 7"]
    for key, cfg in SPORT_CONFIG.items():
        if s.startswith(key.lower()):
            return cfg
    return {"duration": 60, "interval": 70, "rest_min": 60, "max_consecutive": None}


# ─── Configuración de grupos por categoría ────────────────────────────────────
# Clave: (sport_prefix, cat_year_fragment, gender_prefix)
# num_groups: cuántos subgrupos (A, B…)
# intergroup_per_team: cuántos rivales del otro grupo juega cada equipo

CATEGORY_GROUP_CONFIG: dict[tuple, dict] = {
    # Fútbol Masculino 2007-09: 2 grupos × 4 eq, 2 intergrupo por equipo
    ("fútbol",     "2007", "masc"): {"num_groups": 2, "intergroup_per_team": 2},
    # Fútbol Masculino 2010-11: 2 grupos × 5 eq, solo intragrupo
    ("fútbol",     "2010", "masc"): {"num_groups": 2, "intergroup_per_team": 0},
    # Fútbol Masculino 2012-13: 2 grupos × 4 eq, 2 intergrupo por equipo
    ("fútbol",     "2012", "masc"): {"num_groups": 2, "intergroup_per_team": 2},
    # Fútbol Femenino 2007-09: 1 grupo × 5 equipos
    ("fútbol",     "2007", "fem"):  {"num_groups": 1, "intergroup_per_team": 0},
    # Fútbol Femenino 2010-11: 1 grupo × 4 equipos
    ("fútbol",     "2010", "fem"):  {"num_groups": 1, "intergroup_per_team": 0},
    # Fútbol 7 Femenino 2012-13: 1 grupo × 5 equipos
    ("fútbol 7",   "2012", "fem"):  {"num_groups": 1, "intergroup_per_team": 0},
    # Baloncesto Femenino 2007-09: 1 grupo × 3-4 equipos
    ("baloncesto", "2007", "fem"):  {"num_groups": 1, "intergroup_per_team": 0},
    # Baloncesto Femenino 2010-11: 1 grupo × 5 equipos
    ("baloncesto", "2010", "fem"):  {"num_groups": 1, "intergroup_per_team": 0},
    # Baloncesto Masculino 2007-09: 2 grupos × 5 eq, solo intragrupo
    ("baloncesto", "2007", "masc"): {"num_groups": 2, "intergroup_per_team": 0},
    # Baloncesto Masculino 2010-11: 1 grupo único × 7 equipos
    ("baloncesto", "2010", "masc"): {"num_groups": 1, "intergroup_per_team": 0},
    # Baloncesto Masculino 2012-13: 1 grupo × 7 equipos
    ("baloncesto", "2012", "masc"): {"num_groups": 1, "intergroup_per_team": 0},
    # Voleibol Femenino 2007-09: 2 grupos (5 vs 6 eq), 1 intergrupo por equipo
    ("voleibol",   "2007", "fem"):  {"num_groups": 2, "intergroup_per_team": 1},
    # Voleibol Femenino 2010-11: 2 grupos × 6 eq, solo intragrupo
    ("voleibol",   "2010", "fem"):  {"num_groups": 2, "intergroup_per_team": 0},
    # Voleibol Femenino 2012-13: 2 grupos (4 vs 5 eq), 1 intergrupo por equipo
    ("voleibol",   "2012", "fem"):  {"num_groups": 2, "intergroup_per_team": 1},
    # Voleibol Masculino 2007-09: 1 grupo × 6 equipos
    ("voleibol",   "2007", "masc"): {"num_groups": 1, "intergroup_per_team": 0},
}
DEFAULT_GROUP_CONFIG = {"num_groups": 1, "intergroup_per_team": 0}


def _get_group_config(sport: str, category: str, gender: str) -> dict:
    """Retorna la configuración de grupos para la categoría dada."""
    s = sport.lower()
    c = (category or "").lower()
    g = (gender or "").lower()
    g_prefix = "masc" if "masc" in g else "fem"

    # Fútbol 7 debe coincidir antes que Fútbol
    if "7" in s and ("fútbol" in s or "futbol" in s):
        sport_key = "fútbol 7"
    elif "fútbol" in s or "futbol" in s:
        sport_key = "fútbol"
    elif "baloncesto" in s:
        sport_key = "baloncesto"
    elif "voleibol" in s:
        sport_key = "voleibol"
    else:
        return DEFAULT_GROUP_CONFIG

    for (sp, cat_frag, gp), cfg in CATEGORY_GROUP_CONFIG.items():
        if sp == sport_key and cat_frag in c and gp == g_prefix:
            return cfg
    return DEFAULT_GROUP_CONFIG


def _split_groups(teams: list, num_groups: int) -> list[list]:
    """
    Divide equipos en subgrupos.
    Prioriza group_name asignado en el equipo (columna teams.group_name).
    Fallback: división alfabética en N//2.
    Siempre garantiza exactamente num_groups subgrupos.
    """
    if num_groups <= 1:
        return [teams]

    # Si hay equipos con group_name asignado, intentar usarlo
    teams_with_group = [t for t in teams if t.get("group_name")]
    if teams_with_group:
        groups: dict[str, list] = {}
        for t in teams:
            g = t.get("group_name") or "A"
            groups.setdefault(g, []).append(t)
        result = [groups.get(label, []) for label in sorted(groups.keys())]
        # Si los group_names asignados produjeron suficientes grupos, usarlos
        if len(result) >= num_groups:
            return result[:num_groups]
        # Si no (ej. solo hay equipo en grupo A pero no en B), caer al split alfabético

    # Fallback: división alfabética balanceada
    sorted_teams = sorted(teams, key=lambda t: (t.get("name") or "").lower())
    mid = len(sorted_teams) // 2
    return [sorted_teams[:mid], sorted_teams[mid:]]


def _build_intergroup_pairs(group_a: list, group_b: list, per_team: int) -> list[tuple]:
    """
    Genera pares intergrupo donde cada equipo juega `per_team` rivales
    del otro grupo. Usa patrón cíclico para balancear la carga.
    """
    pairs = []
    nb = len(group_b)
    seen = set()
    for i, ta in enumerate(group_a):
        for k in range(per_team):
            tb = group_b[(i + k) % nb]
            key = (min(ta["id"], tb["id"]), max(ta["id"], tb["id"]))
            if key not in seen:
                seen.add(key)
                pairs.append((ta, tb))
    return pairs


# ─── Sedes y canchas ──────────────────────────────────────────────────────────

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
    info = COURTS.get(court_id)
    if not info:
        return court_id
    return f"{info[0]} — {info[1]}"


# ─── Ventanas de disponibilidad ───────────────────────────────────────────────

_W_MONOMEROS = [
    ("2026-03-11",  8,  0, 18, 0),
    ("2026-03-12",  8,  0, 18, 0),
    ("2026-03-13",  8,  0, 18, 0),
    ("2026-03-14",  8,  0, 14, 0),
]

_W_SOLINILLA = [
    ("2026-03-10", 13,  0, 18, 0),
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

_W_VOLEIBOL_GENERAL = [
    ("2026-03-06", 13, 30, 18, 0),
    ("2026-03-07",  8,  0, 13, 0),
    ("2026-03-09", 15,  0, 18, 0),
    ("2026-03-10", 15,  0, 18, 0),
    ("2026-03-11",  8,  0, 18, 0),
    ("2026-03-12",  8,  0, 18, 0),
    ("2026-03-13",  8,  0, 18, 0),
    ("2026-03-14",  8,  0, 14, 0),
]

# Voleibol 2007-09: ⚠️ DEBE TERMINAR el viernes 13 máximo a las 16:00
_W_VOLEIBOL_0709 = [
    ("2026-03-06", 13, 30, 18, 0),
    ("2026-03-07",  8,  0, 13, 0),
    ("2026-03-09", 15,  0, 18, 0),
    ("2026-03-10", 15,  0, 18, 0),
    ("2026-03-11",  8,  0, 18, 0),
    ("2026-03-12",  8,  0, 18, 0),
    ("2026-03-13",  8,  0, 16, 0),  # close = 16:00 → último inicio ≤ 15:00
    ("2026-03-14",  8,  0, 14, 0),
]


def _get_courts_and_windows(sport: str, gender: str, cat_name: str):
    s = sport.lower()
    g = gender.lower()

    if "7" in s and ("fútbol" in s or "futbol" in s):
        return ["british_f7"], _W_BRITISH_FUTBOL

    if "fútbol" in s or "futbol" in s:
        if g == "masculino":
            if "2007" in cat_name:
                return ["monomeros_1"], _W_MONOMEROS
            elif "2010" in cat_name:
                return ["solinilla_1", "solinilla_2", "solinilla_3"], _W_SOLINILLA
            elif "2012" in cat_name:
                return ["simon_bolivar", "british_f11"], _W_BRITISH_FUTBOL
        elif g == "femenino":
            if "2007" in cat_name:
                return ["monomeros_2"], _W_MONOMEROS
            elif "2010" in cat_name:
                return ["solinilla_2"], _W_SOLINILLA
            elif "2012" in cat_name:
                return ["british_f7"], _W_BRITISH_FUTBOL

    if "baloncesto" in s:
        return ["british_basket_1", "british_basket_2"], _W_BASKET

    if "voleibol" in s:
        is_0709 = "2007" in cat_name
        windows = _W_VOLEIBOL_0709 if is_0709 else _W_VOLEIBOL_GENERAL
        if "2012" in cat_name:
            return ["marathon_gym", "british_techo"], windows
        else:
            return ["marathon_gym", "british_sol", "sugar_1", "sugar_2", "sugar_3"], windows

    return [], []


# ─── Slots de disponibilidad ──────────────────────────────────────────────────

def _build_day_slots(windows: list) -> list:
    slots = []
    for date_str, oh, om, ch, cm in windows:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        open_dt    = dt.replace(hour=oh, minute=om)
        close_dt   = dt.replace(hour=ch, minute=cm)
        last_start = close_dt - timedelta(minutes=60)
        if last_start >= open_dt:
            slots.append((open_dt, last_start))
    slots.sort(key=lambda x: x[0])
    return slots


def _snap_to_availability(dt: datetime, day_slots: list) -> Optional[datetime]:
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
    Genera partidos round-robin para una categoría (sport + category + gender).
    Soporta múltiples grupos (A/B) y partidos intergrupo.

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

    # IDs de FK para Supabase
    _sp  = filtered_teams[0].get("sport", {})
    _cat = filtered_teams[0].get("category", {})
    sport_id    = _sp.get("id", "")  if isinstance(_sp, dict)  else ""
    category_id = _cat.get("id", "") if isinstance(_cat, dict) else ""

    cfg        = _get_sport_config(sport)
    duration   = rule.get("match_duration_minutes") or cfg["duration"]
    rest_min   = rule.get("rest_between_matches_minutes") or cfg["rest_min"]
    interval   = cfg["interval"]
    max_consec = cfg["max_consecutive"]

    # Canchas y ventanas
    courts_override = rule.get("courts", [])
    if courts_override:
        court_ids = courts_override
        _, windows = _get_courts_and_windows(sport, gender, category)
    else:
        court_ids, windows = _get_courts_and_windows(sport, gender, category)

    no_courts = not court_ids or not windows
    day_slots = _build_day_slots(windows) if not no_courts else []
    first_available = day_slots[0][0] if day_slots else None

    if court_state is None:
        court_state = {}
    if not no_courts:
        for c in court_ids:
            if c not in court_state:
                court_state[c] = first_available

    # ── Grupos A/B e intergrupo ───────────────────────────────────────────────
    group_cfg   = _get_group_config(sport, category, gender)
    num_groups  = group_cfg["num_groups"]
    ig_per_team = group_cfg["intergroup_per_team"]
    sub_groups  = _split_groups(filtered_teams, num_groups)
    group_labels = ["A", "B", "C"]

    # Construir lista de pares: (t1, t2, group_label, phase)
    all_pairs: list[tuple] = []

    for gi, grp in enumerate(sub_groups):
        label = group_labels[gi] if num_groups > 1 else ""
        n = len(grp)
        for i in range(n):
            for j in range(i + 1, n):
                all_pairs.append((grp[i], grp[j], label, "group"))

    if num_groups >= 2 and ig_per_team > 0 and len(sub_groups) >= 2:
        ig_raw = _build_intergroup_pairs(sub_groups[0], sub_groups[1], ig_per_team)
        for ta, tb in ig_raw:
            all_pairs.append((ta, tb, "Intergrupo", "intergroup"))

    # ── Asignación de horarios ────────────────────────────────────────────────
    matches: list = []
    team_next_avail: dict  = {}
    team_consec: dict      = {}
    team_last_start: dict  = {}
    court_robin = 0

    for t1, t2, group_label, phase in all_pairs:
        best_court = None
        best_time  = None
        best_ci    = 0

        if no_courts or first_available is None:
            # Sin canchas configuradas — crear partido sin fecha
            match = {
                "team_a":      t1["id"],
                "team_b":      t2["id"],
                "sport_id":    sport_id,
                "category_id": category_id,
                "match_date":  None,
                "location":    "",
                "status":      "pending",
                "group_name":  group_label,
                "phase":       phase,
            }
            matches.append(match)
            continue

        team_earliest = max(
            team_next_avail.get(t1["id"], first_available),
            team_next_avail.get(t2["id"], first_available),
        )

        for ci in range(len(court_ids)):
            court      = court_ids[(court_robin + ci) % len(court_ids)]
            court_free = court_state.get(court, first_available)

            candidate = max(team_earliest, court_free)
            snapped   = _snap_to_availability(candidate, day_slots)
            if snapped is None:
                continue

            if best_time is None or snapped < best_time:
                best_time  = snapped
                best_court = court
                best_ci    = ci

        if best_court is not None and best_time is not None:
            court_robin = (court_robin + best_ci + 1) % len(court_ids)
            court_state[best_court] = best_time + timedelta(minutes=interval)

            for tid in (t1["id"], t2["id"]):
                if max_consec is not None:
                    prev_last  = team_last_start.get(tid)
                    if prev_last is not None and (best_time - prev_last) <= timedelta(minutes=interval + 10):
                        new_consec = team_consec.get(tid, 0) + 1
                    else:
                        new_consec = 1

                    team_consec[tid]     = new_consec
                    team_last_start[tid] = best_time

                    if new_consec >= max_consec:
                        team_next_avail[tid] = best_time + timedelta(minutes=interval + 1)
                        team_consec[tid]     = 0
                    else:
                        team_next_avail[tid] = best_time + timedelta(minutes=interval)
                else:
                    team_next_avail[tid] = best_time + timedelta(minutes=duration + rest_min)
                    team_last_start[tid] = best_time

        # Siempre crear el partido — con o sin horario asignado
        match = {
            "team_a":      t1["id"],
            "team_b":      t2["id"],
            "sport_id":    sport_id,
            "category_id": category_id,
            "match_date":  best_time.strftime("%Y-%m-%dT%H:%M:00") + COLOMBIA_TZ if best_time else None,
            "location":    "",
            "status":      "pending",
            "group_name":  group_label,
            "phase":       phase,
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
