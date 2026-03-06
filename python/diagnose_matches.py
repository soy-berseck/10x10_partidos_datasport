"""
diagnose_matches.py — Muestra las UUIDs en matches vs teams para diagnosticar grupos.
Ejecutar desde python/:  python diagnose_matches.py
"""
import os, sys
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client
from collections import defaultdict

URL = os.getenv("SUPABASE_URL", "")
KEY = os.getenv("SUPABASE_ANON_KEY", "")
sb = create_client(URL, KEY)

# Fetch all teams indexed by UUID
teams_raw = (
    sb.table("teams")
    .select("id,name,group_name,sport_id,category_id,schools(name),sports(name),categories(name,gender)")
    .execute()
    .data
)
by_uuid = {t["id"]: t for t in teams_raw}

def team_display(uuid):
    if not uuid: return "NULL"
    t = by_uuid.get(uuid)
    if not t: return f"UNKNOWN({uuid[:8]})"
    school = (t.get("schools") or {}).get("name") or t.get("name") or "?"
    sport  = (t.get("sports") or {}).get("name") or "?"
    cat    = (t.get("categories") or {}).get("name") or "?"
    gen    = (t.get("categories") or {}).get("gender") or "?"
    gn     = t.get("group_name") or "—"
    return f"{school} [{sport}/{cat}/{gen}] grp={gn}"

# Fetch all matches with group_name and phase
matches = (
    sb.table("matches")
    .select("id,team_a,team_b,group_name,phase,sport_id,category_id,sports(name),categories(name,gender)")
    .execute()
    .data
)

print(f"Total matches: {len(matches)}\n")

# Aggregate by (sport, category, gender, phase, group_name) → unique team UUIDs
by_cat_group = defaultdict(lambda: defaultdict(set))
for m in matches:
    sport_name = (m.get("sports") or {}).get("name") or "?"
    cat_name   = (m.get("categories") or {}).get("name") or "?"
    gender     = (m.get("categories") or {}).get("gender") or "?"
    phase      = m.get("phase") or "?"
    gname      = m.get("group_name") or "—"
    cat_key    = f"{sport_name} | {cat_name} | {gender}"
    group_key  = f"{phase}/{gname}"
    for fld in ("team_a", "team_b"):
        uid = m.get(fld)
        if uid:
            by_cat_group[cat_key][group_key].add(uid)

# Show categories with A or B groups
print("=" * 80)
print("TEAMS EN MATCHES (por fase/grupo) vs TEAMS.GROUP_NAME:")
print("=" * 80)
for cat_key in sorted(by_cat_group):
    groups = by_cat_group[cat_key]
    has_ab = any("group/A" in k or "group/B" in k for k in groups)
    if not has_ab:
        continue
    print(f"\n--- {cat_key} ---")
    for gk in sorted(groups):
        uids = groups[gk]
        print(f"  {gk} ({len(uids)} teams):")
        for uid in sorted(uids):
            print(f"    {team_display(uid)}")

# Check specifically Basket 2007-09 Masc and Voleibol 2007-09 Fem
check_cats = [
    "Baloncesto | Nacidos en 2007-2009 | Masculino",
    "Voleibol | Nacidos en 2007-2009 | Femenino",
    "Voleibol | Nacidos en 2010-2011 | Femenino",
    "Voleibol | Nacidos en 2012-2013 | Femenino",
]

print("\n\n" + "=" * 80)
print("CRUCE: MATCHES vs TEAMS.GROUP_NAME para categorías problemáticas")
print("=" * 80)
for cat_key in check_cats:
    groups = by_cat_group.get(cat_key, {})
    if not groups:
        print(f"\n{cat_key}: NO MATCHES FOUND")
        continue
    print(f"\n{cat_key}:")
    all_in_matches = set()
    for gk, uids in groups.items():
        all_in_matches.update(uids)
    for uid in sorted(all_in_matches):
        t = by_uuid.get(uid)
        t_sport = (t.get("sports") or {}).get("name") if t else "?"
        t_cat   = (t.get("categories") or {}).get("name") if t else "?"
        t_gen   = (t.get("categories") or {}).get("gender") if t else "?"
        t_school= (t.get("schools") or {}).get("name") if t else "?"
        t_gn    = t.get("group_name") if t else "?"
        mismatch = ""
        # Find which group this team plays in matches
        for gk, uids in groups.items():
            if uid in uids:
                expected = gk.split("/")[-1] if "/" in gk else "?"
                if t_gn and t_gn not in (expected, "—", "Intergrupo") and expected in ("A","B"):
                    mismatch = f" *** MISMATCH: teams.group_name={t_gn} but plays in {expected} ***"
        print(f"  [{uid[:8]}] {t_school} [{t_sport}/{t_cat}/{t_gen}] group_name={t_gn}{mismatch}")
