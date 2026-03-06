"""
diagnose_pool.py — Simula el matching del seed para una categoría específica.
"""
import os, sys, re, unicodedata
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client

URL = os.getenv("SUPABASE_URL", "")
KEY = os.getenv("SUPABASE_ANON_KEY", "")
sb = create_client(URL, KEY)

def strip_accents(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s)
                   if unicodedata.category(c) != 'Mn')

def normalize(s):
    if not s: return ""
    s = strip_accents(s.lower())
    s = re.sub(r'\bbaq\b', 'barranquilla', s)
    s = re.sub(r'\bbog\b', 'bogota', s)
    s = re.sub(r'c/gena', 'cartagena', s)
    s = re.sub(r'\bcgena\b', 'cartagena', s)
    s = re.sub(r'\bsta\.?\s*marta\b', 'santamarta', s)
    s = re.sub(r'\bmta\b', 'santamarta', s)
    s = re.sub(r'\bgim\b\.?', 'gimnasio', s)
    s = re.sub(r'\bint\b\.?', 'internacional', s)
    s = re.sub(r'\bc\b\.?\s+(?=\w)', 'colegio ', s)
    s = re.sub(r'\blic\b\.?', 'liceo', s)
    s = re.sub(r'\bied\b', 'ied', s)
    s = re.sub(r'[^\w\s]', ' ', s)
    return ' '.join(s.split())

def word_score(query, target):
    stop = {'de', 'la', 'el', 'los', 'las', 'y', 'del', 'en',
            'school', 'colegio', 'gimnasio', 'a', 'the', 'col',
            'liceo', 'internacional'}
    qw = set(normalize(query).split()) - stop
    tw = set(normalize(target).split()) - stop
    if not qw:
        return 0.0
    return len(qw & tw) / len(qw)

# Load all data
teams_raw = sb.table("teams").select("*").execute().data or []
schools   = {s["id"]: s for s in (sb.table("schools").select("id,name").execute().data or [])}
sports_list = sb.table("sports").select("id,name").execute().data or []
cats_list = sb.table("categories").select("id,name,gender,sport_id").execute().data or []

teams = []
for t in teams_raw:
    t = dict(t)
    t["school"] = schools.get(t.get("school_id"), {"name": "?"})
    t["sport_obj"]  = next((s for s in sports_list if s["id"] == t.get("sport_id")),  {"name": "?"})
    t["cat_obj"]    = next((c for c in cats_list   if c["id"] == t.get("category_id")), {"name":"?","gender":"?"})
    teams.append(t)

def get_pool(sport_hint, year, gender):
    sport = next((s for s in sports_list if sport_hint.lower() in s["name"].lower()), None)
    if not sport:
        print(f"Sport '{sport_hint}' not found"); return []
    cat = next((c for c in cats_list
                if c.get("sport_id") == sport["id"]
                and year in c.get("name","")
                and c.get("gender") == gender), None)
    if not cat:
        print(f"Category not found for {sport_hint}/{year}/{gender}"); return []
    pool = [t for t in teams if t.get("sport_id") == sport["id"] and t.get("category_id") == cat["id"]]
    return pool

def show_matches(fixture_name, pool):
    results = []
    for team in pool:
        sc_name = (team.get("school") or {}).get("name", "")
        t_name = team.get("name") or ""
        s = max(word_score(fixture_name, sc_name),
                word_score(fixture_name, t_name),
                word_score(fixture_name, sc_name + " " + t_name))
        results.append((s, sc_name, t_name, team["id"][:8]))
    results.sort(reverse=True)
    print(f"  Query: '{fixture_name}' → normalize='{normalize(fixture_name)}'")
    for s, sc, tn, uid in results[:5]:
        print(f"    {s:.2f}  [{uid}] school='{sc}' name='{tn}'")

# Check Basket 2007-09 Masc
print("=== Basket Masc 2007-09 pool ===")
pool_b07m = get_pool("Baloncesto", "2007", "Masculino")
print(f"Pool size: {len(pool_b07m)}")
for t in pool_b07m:
    sc = (t.get("school") or {}).get("name","?")
    tn = t.get("name") or "?"
    gn = t.get("group_name") or "—"
    print(f"  [{t['id'][:8]}] school='{sc}' name='{tn}' group={gn}")

print()
for name in ["Berckley (Baq)", "Marymount (Baq)", "Cojowa (C/gena)"]:
    show_matches(name, pool_b07m)
print()

# Check Voleibol 2007-09 Fem
print("=== Voleibol Fem 2007-09 pool ===")
pool_v07f = get_pool("Voleibol", "2007", "Femenino")
print(f"Pool size: {len(pool_v07f)}")
for t in pool_v07f:
    sc = (t.get("school") or {}).get("name","?")
    tn = t.get("name") or "?"
    gn = t.get("group_name") or "—"
    print(f"  [{t['id'][:8]}] school='{sc}' name='{tn}' group={gn}")

print()
for name in ["K.C. Parrish (Baq)", "C. Colombo Británico (Cali)", "Alemán (Baq)", "Cojowa (C/gena)", "San José (Baq)"]:
    show_matches(name, pool_v07f)
print()

# Check Voleibol 2010-11 Fem
print("=== Voleibol Fem 2010-11 pool ===")
pool_v10f = get_pool("Voleibol", "2010", "Femenino")
print(f"Pool size: {len(pool_v10f)}")
for t in pool_v10f:
    sc = (t.get("school") or {}).get("name","?")
    tn = t.get("name") or "?"
    gn = t.get("group_name") or "—"
    print(f"  [{t['id'][:8]}] school='{sc}' name='{tn}' group={gn}")
print()
for name in ["Colegio Comfamiliar (Baq)", "Los Corales (Baq)", "Hartford (Baq)"]:
    show_matches(name, pool_v10f)
print()

# Check Voleibol 2012-13 Fem
print("=== Voleibol Fem 2012-13 pool ===")
pool_v12f = get_pool("Voleibol", "2012", "Femenino")
print(f"Pool size: {len(pool_v12f)}")
for t in pool_v12f:
    sc = (t.get("school") or {}).get("name","?")
    tn = t.get("name") or "?"
    gn = t.get("group_name") or "—"
    print(f"  [{t['id'][:8]}] school='{sc}' name='{tn}' group={gn}")
print()
for name in ["Colegio Comfamiliar (Baq)", "K.C. Parrish (Baq)"]:
    show_matches(name, pool_v12f)
