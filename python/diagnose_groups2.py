"""
diagnose_groups2.py — Diagnóstico detallado de grupos por categoría.
Ejecutar desde python/:  python diagnose_groups2.py
"""
import os, sys
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client

URL = os.getenv("SUPABASE_URL", "")
KEY = os.getenv("SUPABASE_ANON_KEY", "")
sb = create_client(URL, KEY)

# Fetch teams with full join
teams = (
    sb.table("teams")
    .select("id,name,group_name,sport_id,category_id,schools(name),sports(name),categories(name,gender)")
    .execute()
    .data
)

print(f"Total teams: {len(teams)}\n")

from collections import defaultdict

# Index teams by id
by_id = {t["id"]: t for t in teams}

# Group by (sport, category, gender)
by_cat: dict = defaultdict(lambda: defaultdict(list))
for t in teams:
    sport_name = (t.get("sports") or {}).get("name") or "?"
    cat_name   = (t.get("categories") or {}).get("name") or "?"
    gender     = (t.get("categories") or {}).get("gender") or "?"
    key = f"{sport_name} | {cat_name} | {gender}"
    gn = t.get("group_name") or "—"
    school_name = (t.get("schools") or {}).get("name") or t.get("name") or "?"
    by_cat[key][gn].append(school_name)

print("=" * 75)
print("CATEGORÍAS CON GRUPOS A/B (con nombres de colegio):")
print("=" * 75)
for key in sorted(by_cat):
    groups = by_cat[key]
    if "A" in groups or "B" in groups:
        cnt_a = len(groups.get("A", []))
        cnt_b = len(groups.get("B", []))
        cnt_none = len(groups.get("—", []))
        flag = " *** DESBALANCEADO ***" if abs(cnt_a - cnt_b) > 1 else ""
        print(f"\n{key}  [A={cnt_a} B={cnt_b} sin-grupo={cnt_none}]{flag}")
        for gn in sorted(groups):
            names = sorted(groups[gn])
            print(f"  [{gn}] ({len(names)}): {', '.join(names)}")

print("\n" + "=" * 75)
print("CATEGORÍAS SIN GRUPOS A/B:")
print("=" * 75)
for key in sorted(by_cat):
    groups = by_cat[key]
    if "A" not in groups and "B" not in groups:
        all_names = []
        for gn, nlist in groups.items():
            all_names.extend(nlist)
        print(f"  {key}: {len(all_names)} equipos  [{', '.join(sorted(all_names))}]")
