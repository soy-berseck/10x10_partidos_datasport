"""
Configuración de deportes: tipos de eventos, términos de puntuación,
y eventos que cuentan como puntuación primaria.
"""

# Mapa de tipos de eventos por deporte (supabase_event_type -> info)
SPORT_EVENT_TYPES_MAP = {
    "Fútbol": [
        {"type": "Gol", "label": "Gol", "icon": "⚽", "affects_score": True, "score_points": 1, "supabase_event_type": "goal"},
        {"type": "Asistencia (Fútbol)", "label": "Asistencia", "icon": "🎯", "affects_score": False, "score_points": 0, "supabase_event_type": "assist_football"},
        {"type": "Tarjeta Amarilla", "label": "Tarjeta Amarilla", "icon": "🟨", "affects_score": False, "score_points": 0, "supabase_event_type": "yellow_card"},
        {"type": "Tarjeta Roja", "label": "Tarjeta Roja", "icon": "🟥", "affects_score": False, "score_points": 0, "supabase_event_type": "red_card"},
        {"type": "Sustitución (Fútbol)", "label": "Sustitución", "icon": "🔄", "affects_score": False, "score_points": 0, "supabase_event_type": "substitution_football"},
        {"type": "Penal", "label": "Penal", "icon": "⏸️", "affects_score": True, "score_points": 1, "supabase_event_type": "penalty"},
    ],
    "Baloncesto": [
        {"type": "Canasta 1pt",   "label": "+1 Tiro Libre", "icon": "🏀", "affects_score": True,  "score_points": 1, "supabase_event_type": "canasta_1pt"},
        {"type": "Canasta 2pts",  "label": "+2 Canasta",    "icon": "🏀", "affects_score": True,  "score_points": 2, "supabase_event_type": "canasta_2pts"},
        {"type": "Canasta 3pts",  "label": "+3 Triple",     "icon": "🏀", "affects_score": True,  "score_points": 3, "supabase_event_type": "canasta_3pts"},
        {"type": "Rebote",        "label": "Rebote",        "icon": "🏀", "affects_score": False, "score_points": 0, "supabase_event_type": "rebote"},
        {"type": "Bloqueo",       "label": "Bloqueo",       "icon": "🚫", "affects_score": False, "score_points": 0, "supabase_event_type": "bloqueo"},
        {"type": "Falta Técnica", "label": "Falta Técnica", "icon": "❌", "affects_score": False, "score_points": 0, "supabase_event_type": "falta_tecnica"},
    ],
    "Voleibol": [
        {"type": "Punto (Voleibol)", "label": "Punto", "icon": "🏐", "affects_score": True, "score_points": 1, "supabase_event_type": "point_volleyball"},
        {"type": "Ace (Saque Directo)", "label": "Ace (Saque directo)", "icon": "🎯", "affects_score": True, "score_points": 1, "supabase_event_type": "ace"},
        {"type": "Bloqueo", "label": "Bloqueo", "icon": "🚫", "affects_score": False, "score_points": 0, "supabase_event_type": "block"},
        {"type": "Sustitución (Voleibol)", "label": "Sustitución", "icon": "🔄", "affects_score": False, "score_points": 0, "supabase_event_type": "substitution_volleyball"},
        {"type": "Error (Voleibol)", "label": "Error", "icon": "❌", "affects_score": False, "score_points": 0, "supabase_event_type": "error_volleyball"},
    ],
    "Natación": [
        {"type": "Registrar Tiempo", "label": "Registrar Tiempo", "icon": "⏱️", "affects_score": False, "score_points": 0, "supabase_event_type": "register_time"},
        {"type": "Posición Final (Natación)", "label": "Posición Final", "icon": "🥇", "affects_score": False, "score_points": 0, "supabase_event_type": "final_position_swimming"},
    ],
    "Tenis": [
        {"type": "Punto (Tenis/Pádel)", "label": "Punto", "icon": "🎾", "affects_score": True, "score_points": 1, "supabase_event_type": "point_tennis_padel"},
        {"type": "Ace (Tenis/Pádel)", "label": "Ace", "icon": "🎯", "affects_score": False, "score_points": 0, "supabase_event_type": "ace_tennis_padel"},
        {"type": "Game Ganado", "label": "Game Ganado", "icon": "🎮", "affects_score": False, "score_points": 0, "supabase_event_type": "game_won"},
        {"type": "Set Ganado", "label": "Set Ganado", "icon": "🏆", "affects_score": False, "score_points": 0, "supabase_event_type": "set_won"},
    ],
    "Pádel": [
        {"type": "Punto (Tenis/Pádel)", "label": "Punto", "icon": "🎾", "affects_score": True, "score_points": 1, "supabase_event_type": "point_tennis_padel"},
        {"type": "Ace (Tenis/Pádel)", "label": "Ace", "icon": "🎯", "affects_score": False, "score_points": 0, "supabase_event_type": "ace_tennis_padel"},
        {"type": "Game Ganado", "label": "Game Ganado", "icon": "🎮", "affects_score": False, "score_points": 0, "supabase_event_type": "game_won"},
        {"type": "Set Ganado", "label": "Set Ganado", "icon": "🏆", "affects_score": False, "score_points": 0, "supabase_event_type": "set_won"},
    ],
    "Softball": [
        {"type": "Homerun", "label": "Homerun", "icon": "🥎", "affects_score": True, "score_points": 1, "supabase_event_type": "homerun"},
    ],
    "Ajedrez": [],
    "Gimnasia": [],
    "Golf": [],
    "Equitación": [],
    "Hípica": [],
}

SPORT_SCORE_TERM_MAP = {
    "Fútbol": "Goles",
    "Baloncesto": "Puntos",
    "Voleibol": "Puntos",
    "Natación": "Tiempos",
    "Tenis": "Puntos",
    "Pádel": "Puntos",
    "Softball": "Puntos",
    "Ajedrez": "Victorias",
    "Gimnasia": "Puntos",
    "Golf": "Golpes",
    "Equitación": "Puntos",
    "Hípica": "Puntos",
}

# Supabase event types que suman puntos al marcador del equipo
PRIMARY_SCORING_SUPABASE_EVENTS = {
    "Fútbol": ["goal", "penalty"],
    "Baloncesto": ["canasta_1pt", "canasta_2pts", "canasta_3pts"],
    "Voleibol": ["point_volleyball", "ace"],
    "Natación": [],
    "Tenis": ["point_tennis_padel"],
    "Pádel": ["point_tennis_padel"],
    "Softball": ["homerun"],
    "Ajedrez": [],
    "Gimnasia": [],
    "Golf": [],
    "Equitación": [],
    "Hípica": [],
}

# Puntos por tipo de evento en Supabase
SUPABASE_EVENT_POINTS = {
    "goal": 1,
    "penalty": 1,
    "canasta_1pt": 1,
    "canasta_2pts": 2,
    "canasta_3pts": 3,
    "point_volleyball": 1,
    "ace": 1,
    "point_tennis_padel": 1,
    "homerun": 1,
}
