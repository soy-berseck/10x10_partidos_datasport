"""
diagnose_groups.py — Muestra cuántos equipos hay en cada grupo por categoría.
Ejecutar desde python/:  python diagnose_groups.py
"""
import os, sys
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client

URL = os.getenv("SUPABASE_URL", "")
KEY = os.getenv("SUPABASE_ANON_KEY", "")
if not URL or not KEY:
    sys.exit("Faltan SUPABASE_URL / SUPABASE_ANON_KEY en .env")

sb = create_client(URL, KEY)

# Fetch teams with sport and category info
teams = (
    sb.table("teams")
    .select("id,name,group_name,sport_id,category_id,sports(name),categories(name,gender)")
    .execute()
    .data
)

print(f"Total teams: {len(teams)}\n")

# Group by (sport, category, gender)
from collections import defaultdict
by_cat: dict = defaultdict(lambda: defaultdict(list))
for t in teams:
    sport_name = (t.get("sports") or {}).get("name", "?")
    cat_name   = (t.get("categories") or {}).get("name", "?")
    gender     = (t.get("categories") or {}).get("gender", "?")
    key = f"{sport_name} | {cat_name} | {gender}"
    gn = t.get("group_name") or "—"
    by_cat[key][gn].append(t.get("name", "?"))

# Print categories with multiple groups
print("=" * 70)
print("CATEGORÍAS CON GRUPOS A/B:")
print("=" * 70)
for key in sorted(by_cat):
    groups = by_cat[key]
    if "A" in groups or "B" in groups:
        total_grouped = sum(len(v) for gn, v in groups.items() if gn in ("A","B"))
        print(f"\n{key}  [{total_grouped} eq. asignados]")
        for gn in sorted(groups):
            teams_in_group = groups[gn]
            names = sorted(n for n in teams_in_group if n)
            print(f"  Grupo {gn} ({len(teams_in_group)}): {', '.join(names)}")

print("\n" + "=" * 70)
print("CATEGORÍAS SIN GRUPOS (group_name=NULL o '—'):")
print("=" * 70)
for key in sorted(by_cat):
    groups = by_cat[key]
    if "A" not in groups and "B" not in groups:
        no_group = groups.get("—", [])
        names = sorted(n for n in no_group if n)
        print(f"  {key}: {len(no_group)} equipos  [{', '.join(names)}]")
