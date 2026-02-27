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
        {"type": "Canasta 1pt", "label": "Canasta 1pt", "icon": "🏀", "affects_score": True, "score_points": 1, "supabase_event_type": "basket_1pt"},
        {"type": "Canasta 2pts", "label": "Canasta 2pts", "icon": "🏀", "affects_score": True, "score_points": 2, "supabase_event_type": "basket_2pts"},
        {"type": "Canasta 3pts", "label": "Canasta 3pts", "icon": "🏀", "affects_score": True, "score_points": 3, "supabase_event_type": "basket_3pts"},
        {"type": "Asistencia (Baloncesto)", "label": "Asistencia", "icon": "🎯", "affects_score": False, "score_points": 0, "supabase_event_type": "assist_basketball"},
        {"type": "Sustitución (Baloncesto)", "label": "Sustitución", "icon": "🔄", "affects_score": False, "score_points": 0, "supabase_event_type": "substitution_basketball"},
        {"type": "Falta Personal", "label": "Falta Personal", "icon": "❌", "affects_score": False, "score_points": 0, "supabase_event_type": "personal_foul"},
        {"type": "Falta Técnica", "label": "Falta Técnica", "icon": "🚫", "affects_score": False, "score_points": 0, "supabase_event_type": "technical_foul"},
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
    "Softbol": [
        {"type": "Gol", "label": "Carrera", "icon": "⚾", "affects_score": True, "score_points": 1, "supabase_event_type": "goal"},
        {"type": "Asistencia (Fútbol)", "label": "Asistencia (Softbol)", "icon": "🎯", "affects_score": False, "score_points": 0, "supabase_event_type": "assist_football"},
        {"type": "Sustitución (Fútbol)", "label": "Sustitución (Softbol)", "icon": "🔄", "affects_score": False, "score_points": 0, "supabase_event_type": "substitution_football"},
    ],
    "Ajedrez": [],
    "Gimnasia": [],
    "Golf": [],
    "Equitación": [],
}

SPORT_SCORE_TERM_MAP = {
    "Fútbol": "Goles",
    "Baloncesto": "Puntos",
    "Voleibol": "Puntos",
    "Natación": "Tiempos",
    "Tenis": "Puntos",
    "Pádel": "Puntos",
    "Softbol": "Carreras",
    "Ajedrez": "Victorias",
    "Gimnasia": "Puntos",
    "Golf": "Golpes",
    "Equitación": "Puntos",
}

# Supabase event types que suman puntos al marcador del equipo
PRIMARY_SCORING_SUPABASE_EVENTS = {
    "Fútbol": ["goal", "penalty"],
    "Baloncesto": ["basket_1pt", "basket_2pts", "basket_3pts"],
    "Voleibol": ["point_volleyball", "ace"],
    "Natación": [],
    "Tenis": ["point_tennis_padel"],
    "Pádel": ["point_tennis_padel"],
    "Softbol": ["goal"],
    "Ajedrez": [],
    "Gimnasia": [],
    "Golf": [],
    "Equitación": [],
}

# Puntos por tipo de evento en Supabase
SUPABASE_EVENT_POINTS = {
    "goal": 1,
    "penalty": 1,
    "basket_1pt": 1,
    "basket_2pts": 2,
    "basket_3pts": 3,
    "point_volleyball": 1,
    "ace": 1,
    "point_tennis_padel": 1,
}
