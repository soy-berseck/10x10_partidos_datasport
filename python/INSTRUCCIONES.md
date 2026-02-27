# DATA SPORT - Python (FastAPI)

## Instalación

### 1. Instalar Python 3.10+
Descarga desde https://python.org

### 2. Crear entorno virtual e instalar dependencias

```bash
cd python
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Ejecutar el servidor

```bash
python main.py
```

O alternativamente:

```bash
uvicorn main:app --reload --port 8000
```

### 4. Abrir en el navegador

```
http://localhost:8000
```

---

## Estructura del Proyecto

```
python/
├── main.py                     # FastAPI app principal
├── requirements.txt            # Dependencias Python
├── .env                        # Credenciales Supabase
├── app/
│   ├── config.py               # Configuración
│   ├── database.py             # Cliente Supabase
│   ├── models.py               # Modelos Pydantic
│   ├── routers/                # Endpoints REST
│   │   ├── schools.py
│   │   ├── sports.py
│   │   ├── categories.py
│   │   ├── teams.py
│   │   ├── players.py
│   │   ├── matches.py
│   │   ├── events.py
│   │   ├── statistics.py
│   │   ├── standings.py
│   │   └── schedule.py
│   ├── services/
│   │   ├── statistics.py       # Cálculo de estadísticas
│   │   └── scheduling.py      # Generación de calendarios
│   └── utils/
│       └── sport_config.py    # Configuración de deportes
└── static/
    ├── index.html              # App SPA
    └── js/
        ├── api.js              # Cliente REST
        ├── app.js              # Controlador principal
        ├── utils.js            # Utilidades
        └── pages/              # Páginas JS
            ├── dashboard.js
            ├── calendar.js
            ├── live_scoring.js
            ├── results.js
            ├── statistics.js
            ├── standings.js
            ├── teams.js
            ├── schools.js
            ├── players.js
            ├── register.js
            └── schedule.js
```

## API REST - Endpoints

- `GET /api/schools/` - Listar colegios
- `GET /api/sports/` - Listar deportes
- `GET /api/categories/` - Listar categorías
- `GET /api/teams/` - Listar equipos
- `GET /api/players/` - Listar jugadores
- `GET /api/matches/` - Listar partidos (filtros: sport, gender, status, date)
- `GET /api/matches/live` - Partidos en vivo
- `GET /api/events/` - Eventos de partidos
- `GET /api/statistics/players` - Estadísticas de jugadores
- `GET /api/statistics/teams` - Estadísticas de equipos
- `GET /api/standings/` - Tabla de posiciones
- `POST /api/schedule/generate` - Generar calendario
- `POST /api/players/import-excel` - Importar jugadores desde Excel

## Documentación API interactiva

```
http://localhost:8000/docs
```
