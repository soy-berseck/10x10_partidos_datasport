"""
create_missing_teams.py — Registra equipos faltantes para el fixture Big Games 2026.

Equipos a crear:
1. Marymount Barranquilla   → Baloncesto Masc 2007-09
2. Colegio Alemán Baq       → Voleibol Fem 2007-09
3. Colegio Alemán Baq       → Voleibol Fem 2010-11
4. Colegio Alemán Baq       → Voleibol Fem 2012-13
"""
import os, sys
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client

URL = os.getenv("SUPABASE_URL", "")
KEY = os.getenv("SUPABASE_ANON_KEY", "")
sb = create_client(URL, KEY)

# ── Fetch all needed IDs ───────────────────────────────────────────────────────
teams_raw  = sb.table("teams").select("id,school_id,sport_id,category_id,schools(name)").execute().data or []
sports_raw = sb.table("sports").select("id,name").execute().data or []
cats_raw   = sb.table("categories").select("id,name,gender,sport_id").execute().data or []
schools_raw = sb.table("schools").select("id,name").execute().data or []

schools = {s["name"]: s["id"] for s in schools_raw}

def get_sport(hint):
    for s in sports_raw:
        if hint.lower() in s["name"].lower():
            return s
    return None

def get_cat(sport_id, year, gender):
    for c in cats_raw:
        if c.get("sport_id") == sport_id and year in c.get("name","") and c.get("gender") == gender:
            return c
    return None

def team_exists(school_id, sport_id, category_id):
    return any(
        t["school_id"] == school_id and t["sport_id"] == sport_id and t["category_id"] == category_id
        for t in teams_raw
    )

# ── Get Marymount school_id ────────────────────────────────────────────────────
marymount_team = next((t for t in teams_raw
                       if isinstance(t.get("schools"), dict)
                       and "Marymount" in (t["schools"].get("name") or "")), None)
marymount_school_id = marymount_team["school_id"] if marymount_team else None
if not marymount_school_id:
    # Try schools dict
    for name, sid in schools.items():
        if "Marymount" in name:
            marymount_school_id = sid
            break

aleman_school_id = schools.get("Colegio Alemán Barranquilla") or \
    next((sid for name, sid in schools.items() if "Alemán" in name and "Barranquilla" in name), None)

# ── Get sport/category IDs ─────────────────────────────────────────────────────
basketball = get_sport("Baloncesto")
voleibol   = get_sport("Voleibol")

basket_m_2007  = get_cat(basketball["id"], "2007", "Masculino") if basketball else None
voley_f_2007   = get_cat(voleibol["id"],   "2007", "Femenino")  if voleibol   else None
voley_f_2010   = get_cat(voleibol["id"],   "2010", "Femenino")  if voleibol   else None
voley_f_2012   = get_cat(voleibol["id"],   "2012", "Femenino")  if voleibol   else None

print("=== IDs encontrados ===")
print(f"  Marymount school_id: {marymount_school_id}")
print(f"  Alemán school_id:    {aleman_school_id}")
print(f"  Basket Masc 2007-09: sport={basketball['id'][:8] if basketball else 'NOT FOUND'}, cat={basket_m_2007['id'][:8] if basket_m_2007 else 'NOT FOUND'}")
print(f"  Voleibol Fem 2007-09: sport={voleibol['id'][:8] if voleibol else 'NOT FOUND'}, cat={voley_f_2007['id'][:8] if voley_f_2007 else 'NOT FOUND'}")
print(f"  Voleibol Fem 2010-11: cat={voley_f_2010['id'][:8] if voley_f_2010 else 'NOT FOUND'}")
print(f"  Voleibol Fem 2012-13: cat={voley_f_2012['id'][:8] if voley_f_2012 else 'NOT FOUND'}")
print()

# ── Create missing teams ───────────────────────────────────────────────────────
to_create = []

if marymount_school_id and basketball and basket_m_2007:
    if not team_exists(marymount_school_id, basketball["id"], basket_m_2007["id"]):
        to_create.append({
            "school_id": marymount_school_id,
            "sport_id":  basketball["id"],
            "category_id": basket_m_2007["id"],
            "name": "Marymount (Baq) Basket Masc 2007-09",
            "label": "Marymount → Basket Masc 2007-09"
        })
    else:
        print("  ✓ Marymount Basket Masc 2007-09 ya existe")

if aleman_school_id and voleibol:
    for cat, label in [(voley_f_2007, "Voleibol Fem 2007-09"),
                       (voley_f_2010, "Voleibol Fem 2010-11"),
                       (voley_f_2012, "Voleibol Fem 2012-13")]:
        if cat:
            if not team_exists(aleman_school_id, voleibol["id"], cat["id"]):
                to_create.append({
                    "school_id": aleman_school_id,
                    "sport_id":  voleibol["id"],
                    "category_id": cat["id"],
                    "name": f"Alemán (Baq) {label}",
                    "label": f"Alemán → {label}"
                })
            else:
                print(f"  ✓ Alemán {label} ya existe")

if not to_create:
    print("Todos los equipos ya existen. Nada que hacer.")
    sys.exit(0)

print(f"Creando {len(to_create)} equipos...")
for entry in to_create:
    payload = {k: v for k, v in entry.items() if k != "label"}
    try:
        resp = sb.table("teams").insert(payload).execute()
        if resp.data:
            print(f"  ✅ {entry['label']}: UUID = {resp.data[0]['id']}")
        else:
            print(f"  ⚠️  {entry['label']}: sin datos en respuesta")
    except Exception as e:
        print(f"  ❌ {entry['label']}: ERROR → {e}")

print("\nListo.")
