"""
seed_matches.py — Big Games 2026
Inserta todos los partidos de la programación oficial en Supabase.

Uso (desde el directorio python/):
    python seed_matches.py           # preview + confirma antes de insertar
    python seed_matches.py --clear   # borra partidos existentes antes de insertar
    python seed_matches.py --dry-run # solo muestra qué insertaría, sin tocar BD
"""

import os, re, sys, unicodedata
from dotenv import load_dotenv

load_dotenv()
from supabase import create_client

URL = os.getenv("SUPABASE_URL", "")
KEY = os.getenv("SUPABASE_ANON_KEY", "")
if not URL or not KEY:
    sys.exit("❌ Faltan SUPABASE_URL / SUPABASE_ANON_KEY en .env")

sb = create_client(URL, KEY)
TZ = "-05:00"

DATES = {
    "Vie 6":  "2026-03-06",
    "Sáb 7":  "2026-03-07",
    "Lun 9":  "2026-03-09",
    "Mar 10": "2026-03-10",
    "Mié 11": "2026-03-11",
    "Jue 12": "2026-03-12",
    "Vie 13": "2026-03-13",
    "Sáb 14": "2026-03-14",
}

# ── FIXTURES ──────────────────────────────────────────────────────────────────
# Cada tupla: (día, hora, equipo_a, equipo_b, sede, grupo, fase)
# fase: "group" | "intergroup" | "playoff"
# grupo: "A" | "B" | "" (único) | "Intergrupo" | None (playoff)
# equipo: None = POR DEFINIR (playoff TBD)

CATS = [
    # ══════════════════════════════════════════════════════════════════════════
    # FÚTBOL
    # ══════════════════════════════════════════════════════════════════════════
    dict(label="Fútbol Masc 2007-09", sport="Fútbol", cat="2007", gender="Masculino",
         matches=[
             ("Mar 10","08:00","British International School (Baq)","Bilingüe (Sta Marta)","Monómeros 1","A","group"),
             ("Mar 10","08:00","Gim. Colombo Británico (Bog)","Cojowa (C/gena)","Solinilla 1","A","group"),
             ("Mar 10","09:10","K.C. Parrish (Baq)","San José (Baq)","Monómeros 1","B","group"),
             ("Mar 10","09:10","Cervantes (Baq)","Anglocolombiano (Bog)","Solinilla 1","B","group"),
             ("Mar 10","10:20","British International School (Baq)","Gim. Colombo Británico (Bog)","Monómeros 1","A","group"),
             ("Mar 10","10:20","Bilingüe (Sta Marta)","Cojowa (C/gena)","Solinilla 1","A","group"),
             ("Mar 10","11:30","K.C. Parrish (Baq)","Cervantes (Baq)","Monómeros 1","B","group"),
             ("Mar 10","11:30","San José (Baq)","Anglocolombiano (Bog)","Solinilla 1","B","group"),
             ("Mar 10","12:40","British International School (Baq)","Cojowa (C/gena)","Monómeros 1","A","group"),
             ("Mar 10","12:40","Bilingüe (Sta Marta)","Gim. Colombo Británico (Bog)","Solinilla 1","A","group"),
             ("Mar 10","13:50","K.C. Parrish (Baq)","Anglocolombiano (Bog)","Monómeros 1","B","group"),
             ("Mar 10","13:50","San José (Baq)","Cervantes (Baq)","Solinilla 1","B","group"),
             ("Mar 10","16:10","British International School (Baq)","K.C. Parrish (Baq)","Monómeros 1","Intergrupo","intergroup"),
             ("Mar 10","16:10","Bilingüe (Sta Marta)","San José (Baq)","Solinilla 1","Intergrupo","intergroup"),
             ("Mié 11","08:00","British International School (Baq)","San José (Baq)","Monómeros 1","Intergrupo","intergroup"),
             ("Mié 11","08:00","Bilingüe (Sta Marta)","K.C. Parrish (Baq)","Solinilla 1","Intergrupo","intergroup"),
             ("Mié 11","09:10","Gim. Colombo Británico (Bog)","Cervantes (Baq)","Monómeros 1","Intergrupo","intergroup"),
             ("Mié 11","09:10","Cojowa (C/gena)","Anglocolombiano (Bog)","Solinilla 1","Intergrupo","intergroup"),
             ("Mié 11","11:30","Gim. Colombo Británico (Bog)","Anglocolombiano (Bog)","Monómeros 1","Intergrupo","intergroup"),
             ("Mié 11","11:30","Cojowa (C/gena)","Cervantes (Baq)","Solinilla 1","Intergrupo","intergroup"),
         ]),

    dict(label="Fútbol Masc 2010-11", sport="Fútbol", cat="2010", gender="Masculino",
         matches=[
             ("Mar 10","13:00","British Int. School (Baq)","C. Colombo Británico (Cali)","Solinilla 1","A","group"),
             ("Mar 10","13:00","Victoria School (Bog)","Bilingüe (Sta Marta)","Solinilla 2","A","group"),
             ("Mar 10","13:00","Jefferson (Cali)","Gim. Campestre (Montería)","Solinilla 3","B","group"),
             ("Mar 10","14:10","Británico (C/gena)","Gim. Colombo Británico (Bog)","Solinilla 1","B","group"),
             ("Mar 10","15:20","British Int. School (Baq)","Victoria School (Bog)","Solinilla 1","A","group"),
             ("Mar 10","15:20","C. Colombo Británico (Cali)","Bilingüe (Sta Marta)","Solinilla 2","A","group"),
             ("Mar 10","15:20","Jefferson (Cali)","Bureche (Sta Marta)","Solinilla 3","B","group"),
             ("Mar 10","16:30","Gim. Campestre (Montería)","Británico (C/gena)","Solinilla 1","B","group"),
             ("Mié 11","08:00","British Int. School (Baq)","Bilingüe (Sta Marta)","Solinilla 1","A","group"),
             ("Mié 11","08:00","C. Colombo Británico (Cali)","Victoria School (Bog)","Solinilla 2","A","group"),
             ("Mié 11","08:00","Jefferson (Cali)","Británico (C/gena)","Solinilla 3","B","group"),
             ("Mié 11","09:10","Gim. Campestre (Montería)","Gim. Colombo Británico (Bog)","Solinilla 1","B","group"),
             ("Mié 11","10:20","British Int. School (Baq)","Alemán (Baq)","Solinilla 1","A","group"),
             ("Mié 11","10:20","Británico (C/gena)","Bureche (Sta Marta)","Solinilla 2","B","group"),
             ("Mié 11","11:30","Jefferson (Cali)","Gim. Colombo Británico (Bog)","Solinilla 1","B","group"),
             ("Mié 11","12:40","C. Colombo Británico (Cali)","Alemán (Baq)","Solinilla 1","A","group"),
             ("Mié 11","12:40","Gim. Campestre (Montería)","Bureche (Sta Marta)","Solinilla 2","B","group"),
             ("Mié 11","15:00","Victoria School (Bog)","Alemán (Baq)","Solinilla 1","A","group"),
             ("Mié 11","15:00","Gim. Colombo Británico (Bog)","Bureche (Sta Marta)","Solinilla 2","B","group"),
             ("Jue 12","08:00","Bilingüe (Sta Marta)","Alemán (Baq)","Solinilla 1","A","group"),
         ]),

    dict(label="Fútbol Masc 2012-13", sport="Fútbol", cat="2012", gender="Masculino",
         matches=[
             ("Mié 11","08:00","British Int. School (Baq) Rojo","Wingate (México)","U. Simón Bolívar Salgar","A","group"),
             ("Mié 11","08:00","Bilingüe (Sta Marta)","Gim. Campestre (Montería)","British 1 externa F11","A","group"),
             ("Mié 11","09:10","Royal School (Baq)","British Int. School (Baq) Azul","U. Simón Bolívar Salgar","B","group"),
             ("Mié 11","09:10","Jefferson (Cali)","Alemán (Baq)","British 1 externa F11","B","group"),
             ("Mié 11","10:20","British Int. School (Baq) Rojo","Bilingüe (Sta Marta)","U. Simón Bolívar Salgar","A","group"),
             ("Mié 11","10:20","Wingate (México)","Gim. Campestre (Montería)","British 1 externa F11","A","group"),
             ("Mié 11","11:30","Royal School (Baq)","Jefferson (Cali)","U. Simón Bolívar Salgar","B","group"),
             ("Mié 11","11:30","British Int. School (Baq) Azul","Alemán (Baq)","British 1 externa F11","B","group"),
             ("Mié 11","12:40","British Int. School (Baq) Rojo","Gim. Campestre (Montería)","U. Simón Bolívar Salgar","A","group"),
             ("Mié 11","12:40","Wingate (México)","Bilingüe (Sta Marta)","British 1 externa F11","A","group"),
             ("Mié 11","13:50","Royal School (Baq)","Alemán (Baq)","U. Simón Bolívar Salgar","B","group"),
             ("Mié 11","13:50","British Int. School (Baq) Azul","Jefferson (Cali)","British 1 externa F11","B","group"),
             ("Mié 11","16:10","British Int. School (Baq) Rojo","Royal School (Baq)","U. Simón Bolívar Salgar","Intergrupo","intergroup"),
             ("Mié 11","16:10","Wingate (México)","British Int. School (Baq) Azul","British 1 externa F11","Intergrupo","intergroup"),
             ("Jue 12","08:00","British Int. School (Baq) Rojo","British Int. School (Baq) Azul","U. Simón Bolívar Salgar","Intergrupo","intergroup"),
             ("Jue 12","08:00","Wingate (México)","Royal School (Baq)","British 1 externa F11","Intergrupo","intergroup"),
             ("Jue 12","09:10","Bilingüe (Sta Marta)","Jefferson (Cali)","U. Simón Bolívar Salgar","Intergrupo","intergroup"),
             ("Jue 12","09:10","Gim. Campestre (Montería)","Alemán (Baq)","British 1 externa F11","Intergrupo","intergroup"),
             ("Jue 12","11:30","Bilingüe (Sta Marta)","Alemán (Baq)","U. Simón Bolívar Salgar","Intergrupo","intergroup"),
             ("Jue 12","11:30","Gim. Campestre (Montería)","Jefferson (Cali)","British 1 externa F11","Intergrupo","intergroup"),
         ]),

    dict(label="Fútbol Fem 2007-09", sport="Fútbol", cat="2007", gender="Femenino",
         matches=[
             ("Mié 11","08:00","British Int. School (Baq)","English School (Bog)","Monómeros 2","","group"),
             ("Mié 11","09:10","Marymount (Baq)","Berckley (Baq)","Monómeros 2","","group"),
             ("Mié 11","10:20","British Int. School (Baq)","Cojowa (C/gena)","Monómeros 2","","group"),
             ("Mié 11","11:30","English School (Bog)","Marymount (Baq)","Monómeros 2","","group"),
             ("Mié 11","12:40","British Int. School (Baq)","Berckley (Baq)","Monómeros 2","","group"),
             ("Mié 11","13:50","English School (Bog)","Cojowa (C/gena)","Monómeros 2","","group"),
             ("Mié 11","15:00","British Int. School (Baq)","Marymount (Baq)","Monómeros 2","","group"),
             ("Mié 11","16:10","English School (Bog)","Berckley (Baq)","Monómeros 2","","group"),
             ("Jue 12","08:00","Marymount (Baq)","Cojowa (C/gena)","Monómeros 2","","group"),
             ("Jue 12","10:20","Berckley (Baq)","Cojowa (C/gena)","Monómeros 2","","group"),
             ("Vie 13","12:00",None,None,"Monómeros 2",None,"playoff"),
             ("Sáb 14","10:00",None,None,"Monómeros 2",None,"playoff"),
             ("Sáb 14","15:00",None,None,"Monómeros 2",None,"playoff"),
         ]),

    dict(label="Fútbol Fem 2010-11", sport="Fútbol", cat="2010", gender="Femenino",
         matches=[
             ("Mié 11","08:00","K.C. Parrish (Baq)","Aspaen (C/gena)","Solinilla 2","","group"),
             ("Mié 11","09:10","Británico (C/gena)","María Mancilla (Pto Colombia)","Solinilla 2","","group"),
             ("Mié 11","11:30","K.C. Parrish (Baq)","Británico (C/gena)","Solinilla 2","","group"),
             ("Mié 11","12:40","Aspaen (C/gena)","María Mancilla (Pto Colombia)","Solinilla 2","","group"),
             ("Mié 11","15:00","K.C. Parrish (Baq)","María Mancilla (Pto Colombia)","Solinilla 2","","group"),
             ("Mié 11","16:10","Aspaen (C/gena)","Británico (C/gena)","Solinilla 2","","group"),
             ("Vie 13","12:00",None,None,"Solinilla 2",None,"playoff"),
             ("Sáb 14","10:00",None,None,"Solinilla 2",None,"playoff"),
             ("Sáb 14","15:00",None,None,"Solinilla 2",None,"playoff"),
         ]),

    dict(label="Fútbol 7 Fem 2012-13", sport="Fútbol 7", cat="2012", gender="Femenino",
         matches=[
             ("Mié 11","08:00","British Int. School (Baq)","Wingate (México)","British 2 interna F7","","group"),
             ("Mié 11","09:10","Victoria School (Bog)","Jefferson (Cali)","British 2 interna F7","","group"),
             ("Mié 11","10:20","British Int. School (Baq)","Industrial (Palmar)","British 2 interna F7","","group"),
             ("Mié 11","11:30","Wingate (México)","Victoria School (Bog)","British 2 interna F7","","group"),
             ("Mié 11","12:40","British Int. School (Baq)","Jefferson (Cali)","British 2 interna F7","","group"),
             ("Mié 11","13:50","Wingate (México)","Industrial (Palmar)","British 2 interna F7","","group"),
             ("Mié 11","15:00","British Int. School (Baq)","Victoria School (Bog)","British 2 interna F7","","group"),
             ("Mié 11","16:10","Wingate (México)","Jefferson (Cali)","British 2 interna F7","","group"),
             ("Jue 12","08:00","Victoria School (Bog)","Industrial (Palmar)","British 2 interna F7","","group"),
             ("Jue 12","10:20","Jefferson (Cali)","Industrial (Palmar)","British 2 interna F7","","group"),
             ("Vie 13","12:00",None,None,"British 2 interna F7",None,"playoff"),
             ("Sáb 14","10:00",None,None,"British 2 interna F7",None,"playoff"),
             ("Sáb 14","15:00",None,None,"British 2 interna F7",None,"playoff"),
         ]),

    # ══════════════════════════════════════════════════════════════════════════
    # BALONCESTO
    # ══════════════════════════════════════════════════════════════════════════
    dict(label="Basket Fem 2007-09", sport="Baloncesto", cat="2007", gender="Femenino",
         matches=[
             ("Mié 11","08:00","CIEDI (Bog)","Gim. Colombo Británico (Bog)","British 1","","group"),
             ("Mié 11","10:20","CIEDI (Bog)","Guerreros (Baq)","British 1","","group"),
             ("Mié 11","12:40","Gim. Colombo Británico (Bog)","Guerreros (Baq)","British 1","","group"),
             ("Vie 13","12:00",None,None,"British 1",None,"playoff"),
             ("Sáb 14","10:00",None,None,"British 1",None,"playoff"),
         ]),

    dict(label="Basket Fem 2010-11", sport="Baloncesto", cat="2010", gender="Femenino",
         matches=[
             ("Mié 11","08:00","Alemán (Baq)","Gim. Campestre (Montería)","British 1","","group"),
             ("Mié 11","08:00","Montessori (Med)","Corales (Baq)","British 2","","group"),
             ("Mié 11","10:20","Alemán (Baq)","Montessori (Med)","British 1","","group"),
             ("Mié 11","10:20","Gim. Campestre (Montería)","Corales (Baq)","British 2","","group"),
             ("Mié 11","12:40","Alemán (Baq)","Corales (Baq)","British 1","","group"),
             ("Mié 11","12:40","Gim. Campestre (Montería)","Montessori (Med)","British 2","","group"),
             ("Mié 11","15:00","Alemán (Baq)","Guerreros (Baq)","British 1","","group"),
             ("Jue 12","08:00","Gim. Campestre (Montería)","Guerreros (Baq)","British 1","","group"),
             ("Jue 12","10:20","Montessori (Med)","Guerreros (Baq)","British 1","","group"),
             ("Jue 12","12:40","Corales (Baq)","Guerreros (Baq)","British 1","","group"),
             ("Vie 13","12:00",None,None,"British 1",None,"playoff"),
             ("Sáb 14","10:00",None,None,"British 1",None,"playoff"),
             ("Sáb 14","15:00",None,None,"British 1",None,"playoff"),
         ]),

    dict(label="Basket Masc 2007-09", sport="Baloncesto", cat="2007", gender="Masculino",
         matches=[
             ("Mié 11","08:00","British International School (Baq)","Gim. Campestre (Montería)","British 1","A","group"),
             ("Mié 11","08:00","Gim. Colombo Británico (Bog)","English School (Bog)","British 2","A","group"),
             ("Mié 11","09:10","Berckley (Baq)","San José (Baq)","British 1","B","group"),
             ("Mié 11","09:10","Marymount (Baq)","I.E.D. Carlos Meisel (Baq)","British 2","B","group"),
             ("Mié 11","10:20","British International School (Baq)","Gim. Colombo Británico (Bog)","British 1","A","group"),
             ("Mié 11","10:20","Gim. Campestre (Montería)","English School (Bog)","British 2","A","group"),
             ("Mié 11","11:30","Berckley (Baq)","Marymount (Baq)","British 1","B","group"),
             ("Mié 11","11:30","San José (Baq)","I.E.D. Carlos Meisel (Baq)","British 2","B","group"),
             ("Mié 11","12:40","British International School (Baq)","English School (Bog)","British 1","A","group"),
             ("Mié 11","12:40","Gim. Campestre (Montería)","Gim. Colombo Británico (Bog)","British 2","A","group"),
             ("Mié 11","13:50","Berckley (Baq)","I.E.D. Carlos Meisel (Baq)","British 1","B","group"),
             ("Mié 11","13:50","San José (Baq)","Marymount (Baq)","British 2","B","group"),
             ("Mié 11","15:00","British International School (Baq)","Cojowa (C/gena)","British 1","A","group"),
             ("Mié 11","16:10","Berckley (Baq)","Alemán (Baq)","British 1","B","group"),
             ("Mié 11","16:10","Gim. Campestre (Montería)","San José (Baq)","British 2","Intergrupo","intergroup"),
             ("Jue 12","08:00","Gim. Campestre (Montería)","Cojowa (C/gena)","British 1","A","group"),
             ("Jue 12","08:00","San José (Baq)","Alemán (Baq)","British 2","B","group"),
             ("Jue 12","09:10","British International School (Baq)","Berckley (Baq)","British 1","Intergrupo","intergroup"),
             ("Jue 12","09:10","Gim. Colombo Británico (Bog)","Marymount (Baq)","British 2","Intergrupo","intergroup"),
             ("Jue 12","10:20","English School (Bog)","Cojowa (C/gena)","British 1","A","group"),
             ("Jue 12","10:20","I.E.D. Carlos Meisel (Baq)","Alemán (Baq)","British 2","B","group"),
             ("Jue 12","12:40","Gim. Colombo Británico (Bog)","Cojowa (C/gena)","British 1","A","group"),
             ("Jue 12","12:40","Marymount (Baq)","Alemán (Baq)","British 2","B","group"),
             ("Jue 12","13:50","English School (Bog)","I.E.D. Carlos Meisel (Baq)","British 1","Intergrupo","intergroup"),
             ("Jue 12","15:00","Cojowa (C/gena)","Alemán (Baq)","British 1","Intergrupo","intergroup"),
             ("Vie 13","12:00",None,None,"British 1",None,"playoff"),
             ("Sáb 14","10:00",None,None,"British 1",None,"playoff"),
         ]),

    dict(label="Basket Masc 2010-11", sport="Baloncesto", cat="2010", gender="Masculino",
         matches=[
             ("Mié 11","08:00","British Int. School (Baq)","Montessori (Med)","British 1","","group"),
             ("Mié 11","08:00","Anglocolombiano (Bog)","Jefferson (Cali)","British 2","","group"),
             ("Mié 11","09:10","Bureche (Sta Marta)","Royal School (Baq)","British 1","","group"),
             ("Mié 11","10:20","British Int. School (Baq)","Anglocolombiano (Bog)","British 1","","group"),
             ("Mié 11","10:20","Montessori (Med)","Jefferson (Cali)","British 2","","group"),
             ("Mié 11","11:30","Bureche (Sta Marta)","Alemán (Baq)","British 1","","group"),
             ("Mié 11","12:40","British Int. School (Baq)","Jefferson (Cali)","British 1","","group"),
             ("Mié 11","12:40","Montessori (Med)","Anglocolombiano (Bog)","British 2","","group"),
             ("Mié 11","13:50","Royal School (Baq)","Alemán (Baq)","British 1","","group"),
             ("Mié 11","15:00","British Int. School (Baq)","Bureche (Sta Marta)","British 1","","group"),
             ("Mié 11","16:10","Montessori (Med)","Royal School (Baq)","British 1","","group"),
             ("Mié 11","16:10","Anglocolombiano (Bog)","Alemán (Baq)","British 2","","group"),
             ("Jue 12","08:00","British Int. School (Baq)","Royal School (Baq)","British 1","","group"),
             ("Jue 12","08:00","Montessori (Med)","Bureche (Sta Marta)","British 2","","group"),
             ("Jue 12","09:10","Jefferson (Cali)","Alemán (Baq)","British 1","","group"),
             ("Jue 12","10:20","Anglocolombiano (Bog)","Bureche (Sta Marta)","British 1","","group"),
             ("Jue 12","11:30","British Int. School (Baq)","Alemán (Baq)","British 1","","group"),
             ("Jue 12","11:30","Jefferson (Cali)","Royal School (Baq)","British 2","","group"),
             ("Jue 12","13:50","Montessori (Med)","Alemán (Baq)","British 1","","group"),
             ("Jue 12","13:50","Anglocolombiano (Bog)","Royal School (Baq)","British 2","","group"),
             ("Jue 12","15:00","Jefferson (Cali)","Bureche (Sta Marta)","British 1","","group"),
             ("Vie 13","12:00",None,None,"British 1",None,"playoff"),
             ("Sáb 14","10:00",None,None,"British 1",None,"playoff"),
         ]),

    dict(label="Basket Masc 2012-13", sport="Baloncesto", cat="2012", gender="Masculino",
         matches=[
             ("Mié 11","08:00","British Int. School (Baq)","Columbus (Medellín)","British 1","","group"),
             ("Mié 11","08:00","Británico (C/gena)","K.C. Parrish (Baq)","British 2","","group"),
             ("Mié 11","09:10","Hebreo Unión (Baq)","Alemán (Baq)","British 1","","group"),
             ("Mié 11","10:20","British Int. School (Baq)","Británico (C/gena)","British 1","","group"),
             ("Mié 11","10:20","Columbus (Medellín)","K.C. Parrish (Baq)","British 2","","group"),
             ("Mié 11","11:30","Hebreo Unión (Baq)","Anglocolombiano (Bog)","British 1","","group"),
             ("Mié 11","12:40","British Int. School (Baq)","K.C. Parrish (Baq)","British 1","","group"),
             ("Mié 11","12:40","Columbus (Medellín)","Británico (C/gena)","British 2","","group"),
             ("Mié 11","13:50","Alemán (Baq)","Anglocolombiano (Bog)","British 1","","group"),
             ("Mié 11","15:00","British Int. School (Baq)","Hebreo Unión (Baq)","British 1","","group"),
             ("Mié 11","16:10","Columbus (Medellín)","Alemán (Baq)","British 1","","group"),
             ("Mié 11","16:10","Británico (C/gena)","Anglocolombiano (Bog)","British 2","","group"),
             ("Jue 12","08:00","British Int. School (Baq)","Alemán (Baq)","British 1","","group"),
             ("Jue 12","08:00","Columbus (Medellín)","Hebreo Unión (Baq)","British 2","","group"),
             ("Jue 12","09:10","K.C. Parrish (Baq)","Anglocolombiano (Bog)","British 1","","group"),
             ("Jue 12","10:20","Británico (C/gena)","Hebreo Unión (Baq)","British 1","","group"),
             ("Jue 12","11:30","British Int. School (Baq)","Anglocolombiano (Bog)","British 1","","group"),
             ("Jue 12","11:30","K.C. Parrish (Baq)","Alemán (Baq)","British 2","","group"),
             ("Jue 12","13:50","Columbus (Medellín)","Anglocolombiano (Bog)","British 1","","group"),
             ("Jue 12","13:50","Británico (C/gena)","Alemán (Baq)","British 2","","group"),
             ("Jue 12","15:00","K.C. Parrish (Baq)","Hebreo Unión (Baq)","British 1","","group"),
             ("Vie 13","12:00",None,None,"British 1",None,"playoff"),
             ("Sáb 14","10:00",None,None,"British 1",None,"playoff"),
         ]),

    # ══════════════════════════════════════════════════════════════════════════
    # VOLEIBOL
    # ══════════════════════════════════════════════════════════════════════════
    dict(label="Voleibol Fem 2007-09", sport="Voleibol", cat="2007", gender="Femenino",
         matches=[
             ("Vie 6","13:30","British International School (Baq)","Gim. Colombo Británico (Bog)","Marathon gym","A","group"),
             ("Vie 6","13:30","K.C. Parrish (Baq)","C. Colombo Británico (Cali)","British sol","A","group"),
             ("Vie 6","13:30","Hartford (Baq)","San José (Baq)","Sugar 1","B","group"),
             ("Vie 6","13:30","Hebreo Unión (Baq)","Alemán (Baq)","Sugar 2","B","group"),
             ("Vie 6","13:30","San Viator (Tunja)","Cojowa (C/gena)","Sugar 3","B","group"),
             ("Vie 6","14:45","British International School (Baq)","K.C. Parrish (Baq)","Marathon gym","A","group"),
             ("Vie 6","14:45","Gim. Colombo Británico (Bog)","C. Colombo Británico (Cali)","British sol","A","group"),
             ("Vie 6","14:45","Hartford (Baq)","Hebreo Unión (Baq)","Sugar 1","B","group"),
             ("Vie 6","14:45","San José (Baq)","Alemán (Baq)","Sugar 2","B","group"),
             ("Vie 6","14:45","Marymount (Baq)","San Viator (Tunja)","Sugar 3","Intergrupo","intergroup"),
             ("Vie 6","16:00","British International School (Baq)","C. Colombo Británico (Cali)","Marathon gym","A","group"),
             ("Vie 6","16:00","Gim. Colombo Británico (Bog)","K.C. Parrish (Baq)","British sol","A","group"),
             ("Vie 6","16:00","Hartford (Baq)","Alemán (Baq)","Sugar 1","B","group"),
             ("Vie 6","16:00","San José (Baq)","Hebreo Unión (Baq)","Sugar 2","B","group"),
             ("Sáb 7","08:00","British International School (Baq)","Marymount (Baq)","Marathon gym","A","group"),
             ("Sáb 7","08:00","Hartford (Baq)","San Viator (Tunja)","British sol","B","group"),
             ("Sáb 7","08:00","San José (Baq)","Cojowa (C/gena)","Sugar 1","B","group"),
             ("Sáb 7","08:00","K.C. Parrish (Baq)","Hebreo Unión (Baq)","Sugar 2","Intergrupo","intergroup"),
             ("Sáb 7","08:00","C. Colombo Británico (Cali)","Alemán (Baq)","Sugar 3","Intergrupo","intergroup"),
             ("Sáb 7","09:15","Gim. Colombo Británico (Bog)","Marymount (Baq)","Marathon gym","A","group"),
             ("Sáb 7","09:15","Hartford (Baq)","Cojowa (C/gena)","British sol","B","group"),
             ("Sáb 7","09:15","San José (Baq)","San Viator (Tunja)","Sugar 1","B","group"),
             ("Sáb 7","10:30","K.C. Parrish (Baq)","Marymount (Baq)","Marathon gym","A","group"),
             ("Sáb 7","10:30","Hebreo Unión (Baq)","San Viator (Tunja)","British sol","B","group"),
             ("Sáb 7","10:30","Alemán (Baq)","Cojowa (C/gena)","Sugar 1","B","group"),
             ("Sáb 7","10:30","British International School (Baq)","Hartford (Baq)","Sugar 2","Intergrupo","intergroup"),
             ("Sáb 7","10:30","Gim. Colombo Británico (Bog)","San José (Baq)","Sugar 3","Intergrupo","intergroup"),
             ("Sáb 7","11:45","C. Colombo Británico (Cali)","Marymount (Baq)","Marathon gym","A","group"),
             ("Sáb 7","11:45","Hebreo Unión (Baq)","Cojowa (C/gena)","British sol","B","group"),
             ("Sáb 7","11:45","Alemán (Baq)","San Viator (Tunja)","Sugar 1","B","group"),
             ("Jue 12","12:00",None,None,"Marathon gym",None,"playoff"),
             ("Vie 13","12:00",None,None,"Marathon gym",None,"playoff"),
         ]),

    dict(label="Voleibol Fem 2010-11", sport="Voleibol", cat="2010", gender="Femenino",
         matches=[
             ("Vie 6","13:30","British Int. School (Baq)","Comfamiliar (Baq)","Marathon gym","A","group"),
             ("Vie 6","13:30","Wingate (México)","Gim. Colombo Británico (Bog)","British sol","A","group"),
             ("Vie 6","13:30","Británico (C/gena)","Lic. T. S. Miguel (Pereira)","Sugar 1","A","group"),
             ("Vie 6","13:30","Gim. Campestre (Montería)","Alemán (Baq)","Sugar 2","B","group"),
             ("Vie 6","13:30","Los Corales (Baq)","Bureche (Sta Marta)","Sugar 3","B","group"),
             ("Vie 6","14:45","British Int. School (Baq)","Wingate (México)","Marathon gym","A","group"),
             ("Vie 6","14:45","Comfamiliar (Baq)","Gim. Colombo Británico (Bog)","British sol","A","group"),
             ("Vie 6","14:45","Gim. Campestre (Montería)","Los Corales (Baq)","Sugar 1","B","group"),
             ("Vie 6","14:45","Alemán (Baq)","Bureche (Sta Marta)","Sugar 2","B","group"),
             ("Vie 6","14:45","Aspaen (C/gena)","Hartford (Baq)","Sugar 3","B","group"),
             ("Vie 6","16:00","British Int. School (Baq)","Gim. Colombo Británico (Bog)","Marathon gym","A","group"),
             ("Vie 6","16:00","Comfamiliar (Baq)","Wingate (México)","British sol","A","group"),
             ("Vie 6","16:00","Gim. Campestre (Montería)","Bureche (Sta Marta)","Sugar 1","B","group"),
             ("Vie 6","16:00","Alemán (Baq)","Los Corales (Baq)","Sugar 2","B","group"),
             ("Sáb 7","08:00","British Int. School (Baq)","Británico (C/gena)","Marathon gym","A","group"),
             ("Sáb 7","08:00","Comfamiliar (Baq)","Lic. T. S. Miguel (Pereira)","British sol","A","group"),
             ("Sáb 7","08:00","Gim. Campestre (Montería)","Aspaen (C/gena)","Sugar 1","B","group"),
             ("Sáb 7","08:00","Alemán (Baq)","Hartford (Baq)","Sugar 2","B","group"),
             ("Sáb 7","09:15","British Int. School (Baq)","Lic. T. S. Miguel (Pereira)","Marathon gym","A","group"),
             ("Sáb 7","09:15","Comfamiliar (Baq)","Británico (C/gena)","British sol","A","group"),
             ("Sáb 7","09:15","Gim. Campestre (Montería)","Hartford (Baq)","Sugar 1","B","group"),
             ("Sáb 7","09:15","Alemán (Baq)","Aspaen (C/gena)","Sugar 2","B","group"),
             ("Sáb 7","10:30","Wingate (México)","Británico (C/gena)","Marathon gym","A","group"),
             ("Sáb 7","10:30","Gim. Colombo Británico (Bog)","Lic. T. S. Miguel (Pereira)","British sol","A","group"),
             ("Sáb 7","10:30","Los Corales (Baq)","Aspaen (C/gena)","Sugar 1","B","group"),
             ("Sáb 7","10:30","Bureche (Sta Marta)","Hartford (Baq)","Sugar 2","B","group"),
             ("Sáb 7","11:45","Wingate (México)","Lic. T. S. Miguel (Pereira)","Marathon gym","A","group"),
             ("Sáb 7","11:45","Gim. Colombo Británico (Bog)","Británico (C/gena)","British sol","A","group"),
             ("Sáb 7","11:45","Los Corales (Baq)","Hartford (Baq)","Sugar 1","B","group"),
             ("Sáb 7","11:45","Bureche (Sta Marta)","Aspaen (C/gena)","Sugar 2","B","group"),
             ("Vie 13","12:00",None,None,"Marathon gym",None,"playoff"),
             ("Sáb 14","10:00",None,None,"Marathon gym",None,"playoff"),
         ]),

    dict(label="Voleibol Fem 2012-13", sport="Voleibol", cat="2012", gender="Femenino",
         matches=[
             ("Vie 6","13:30","British Int. School (Baq)","Wingate (México)","Marathon gym","A","group"),
             ("Vie 6","13:30","Victoria School (Bog)","Lic. T. S. Miguel (Pereira)","British techo","A","group"),
             ("Vie 6","14:45","British Int. School (Baq)","Victoria School (Bog)","Marathon gym","A","group"),
             ("Vie 6","14:45","Wingate (México)","Lic. T. S. Miguel (Pereira)","British techo","A","group"),
             ("Vie 6","16:00","British Int. School (Baq)","Lic. T. S. Miguel (Pereira)","Marathon gym","A","group"),
             ("Vie 6","16:00","Wingate (México)","Victoria School (Bog)","British techo","A","group"),
             ("Sáb 7","08:00","Gim. Campestre (Montería)","Gim del Norte (V/dupar)","Marathon gym","B","group"),
             ("Sáb 7","08:00","K.C. Parrish (Baq)","Comfamiliar (Baq)","British techo","B","group"),
             ("Sáb 7","09:15","Gim. Campestre (Montería)","K.C. Parrish (Baq)","Marathon gym","B","group"),
             ("Sáb 7","09:15","Gim del Norte (V/dupar)","Comfamiliar (Baq)","British techo","B","group"),
             ("Sáb 7","10:30","Gim. Campestre (Montería)","Comfamiliar (Baq)","Marathon gym","B","group"),
             ("Sáb 7","10:30","Gim del Norte (V/dupar)","K.C. Parrish (Baq)","British techo","B","group"),
             ("Sáb 7","11:45","Gim. Campestre (Montería)","Alemán (Baq)","Marathon gym","B","group"),
             ("Sáb 7","11:45","Wingate (México)","Gim del Norte (V/dupar)","British techo","Intergrupo","intergroup"),
             ("Lun 9","15:00","Gim del Norte (V/dupar)","Alemán (Baq)","Marathon gym","B","group"),
             ("Lun 9","15:00","British Int. School (Baq)","Gim. Campestre (Montería)","British techo","Intergrupo","intergroup"),
             ("Lun 9","16:15","K.C. Parrish (Baq)","Alemán (Baq)","Marathon gym","B","group"),
             ("Lun 9","16:15","Lic. T. S. Miguel (Pereira)","Comfamiliar (Baq)","British techo","Intergrupo","intergroup"),
             ("Mar 10","15:00","Comfamiliar (Baq)","Alemán (Baq)","Marathon gym","B","group"),
             ("Mar 10","15:00","Victoria School (Bog)","K.C. Parrish (Baq)","British techo","Intergrupo","intergroup"),
             ("Vie 13","12:00",None,None,"Marathon gym",None,"playoff"),
             ("Sáb 14","10:00",None,None,"Marathon gym",None,"playoff"),
         ]),

    dict(label="Voleibol Masc 2007-09", sport="Voleibol", cat="2007", gender="Masculino",
         matches=[
             ("Vie 6","13:30","Anglocolombiano (Bog)","Lic. Taller S. Miguel (Pereira)","Marathon gym","","group"),
             ("Vie 6","13:30","K.C. Parrish (Baq)","San José (Baq)","British sol","","group"),
             ("Vie 6","13:30","Alemán (Baq)","Británico (C/gena)","Sugar 1","","group"),
             ("Vie 6","14:45","Anglocolombiano (Bog)","K.C. Parrish (Baq)","Marathon gym","","group"),
             ("Vie 6","14:45","Lic. Taller S. Miguel (Pereira)","San José (Baq)","British sol","","group"),
             ("Vie 6","16:00","Anglocolombiano (Bog)","San José (Baq)","Marathon gym","","group"),
             ("Vie 6","16:00","Lic. Taller S. Miguel (Pereira)","K.C. Parrish (Baq)","British sol","","group"),
             ("Sáb 7","08:00","Anglocolombiano (Bog)","Alemán (Baq)","Marathon gym","","group"),
             ("Sáb 7","08:00","Lic. Taller S. Miguel (Pereira)","Británico (C/gena)","British sol","","group"),
             ("Sáb 7","09:15","Anglocolombiano (Bog)","Británico (C/gena)","Marathon gym","","group"),
             ("Sáb 7","09:15","Lic. Taller S. Miguel (Pereira)","Alemán (Baq)","British sol","","group"),
             ("Sáb 7","10:30","K.C. Parrish (Baq)","Alemán (Baq)","Marathon gym","","group"),
             ("Sáb 7","10:30","San José (Baq)","Británico (C/gena)","British sol","","group"),
             ("Sáb 7","11:45","K.C. Parrish (Baq)","Británico (C/gena)","Marathon gym","","group"),
             ("Sáb 7","11:45","San José (Baq)","Alemán (Baq)","British sol","","group"),
             ("Jue 12","12:00",None,None,"Marathon gym",None,"playoff"),
             ("Vie 13","12:00",None,None,"Marathon gym",None,"playoff"),
         ]),
]

# ── EXPLICIT TEAM UUID OVERRIDES ──────────────────────────────────────────────
# Fuerza el uso de un team_id específico cuando el nombre del fixture coincide.
# Útil cuando el equipo tiene restricciones de unicidad en BD que impiden
# moverlo a la categoría correcta (ej. dos equipos de la misma escuela en la misma categoría).
# Clave: nombre normalizado del fixture (sin tildes, minúsculas, sin puntuación)
TEAM_ID_OVERRIDES: dict[str, str] = {
    # Añade aquí overrides explícitos de UUID si es necesario.
    # Formato: "nombre_normalizado_del_fixture": "uuid-del-team-en-supabase"
    # Ejemplo (ya no necesario si British Azul está correctamente en Masculino):
    # "british internacional school barranquilla azul": "dceaaa35-...",
}

# ── ALIASES ───────────────────────────────────────────────────────────────────
# Mapeo de fragmentos de nombres del fixture → nombre real en Supabase
# Clave: fragmento normalizado (sin tildes, minúsculas)
# Valor: nombre alternativo para buscar (sin tildes, minúsculas)
ALIASES = {
    "cojowa":               "jorge washington",     # Cojowa (C/gena) = Colegio Jorge Washington
    "jorge washington":     "jorge washington",     # por si acaso
    "liceo t s miguel":     "liceo taller san miguel",  # "Lic. T. S. Miguel" = "Taller San Miguel"
    "liceo taller s miguel": "liceo taller san miguel", # variante "Lic. Taller S. Miguel"
}

# ── HELPERS ───────────────────────────────────────────────────────────────────

def strip_accents(s: str) -> str:
    return ''.join(c for c in unicodedata.normalize('NFD', s)
                   if unicodedata.category(c) != 'Mn')


def normalize(s: str) -> str:
    if not s:
        return ""
    s = strip_accents(s.lower())
    # Expandir abreviaciones de ciudades ANTES de quitar puntuación
    s = re.sub(r'\bbaq\b', 'barranquilla', s)
    s = re.sub(r'\bbog\b', 'bogota', s)
    s = re.sub(r'c/gena', 'cartagena', s)          # C/gena → cartagena
    s = re.sub(r'\bcgena\b', 'cartagena', s)
    s = re.sub(r'\bsta\.?\s*marta\b', 'santamarta', s)
    s = re.sub(r'\bmta\b', 'santamarta', s)
    # Expandir abreviaciones de institución
    s = re.sub(r'\bgim\b\.?', 'gimnasio', s)
    s = re.sub(r'\bint\b\.?', 'internacional', s)
    s = re.sub(r'\bc\b\.?\s+(?=\w)', 'colegio ', s)
    s = re.sub(r'\blic\b\.?', 'liceo', s)
    s = re.sub(r'\bied\b', 'ied', s)
    s = re.sub(r'[^\w\s]', ' ', s)
    return ' '.join(s.split())


# Ciudades que comparten muchos colegios: pesan menos para no crear falsos positivos
CITIES = {'barranquilla', 'bogota', 'cartagena', 'cali', 'medellin',
          'santamarta', 'tunja', 'valledupar', 'monteria', 'pereira',
          'bogotá', 'medellín', 'montería', 'colombia', 'mexico'}

def word_score(query: str, target: str) -> float:
    # Palabras genéricas que no distinguen equipos (artículos, instituciones)
    # Las ciudades se ponderan a 0.3 para no crear falsos positivos por ciudad compartida
    stop = {'de', 'la', 'el', 'los', 'las', 'y', 'del', 'en',
            'school', 'colegio', 'gimnasio', 'a', 'the', 'col',
            'liceo', 'internacional'}
    qw = set(normalize(query).split()) - stop
    tw = set(normalize(target).split()) - stop
    if not qw:
        return 0.0
    score = 0.0
    for w in qw:
        if w in tw:
            score += 0.3 if w in CITIES else 1.0
    return score / len(qw)


def find_team(fixture_name: str, candidates: list, all_teams: list = None):
    """
    Retorna (team_id, school_display, score).
    Busca el equipo de la lista que mejor coincide con fixture_name.
    Aplica TEAM_ID_OVERRIDES, ALIASES y tiene fallback al pool de color.
    """
    if not candidates:
        return None, "?", 0.0

    # Primero verificar overrides explícitos de UUID
    fn_norm_key = normalize(fixture_name)
    if fn_norm_key in TEAM_ID_OVERRIDES:
        forced_id = TEAM_ID_OVERRIDES[fn_norm_key]
        # Buscar el equipo en la lista global (all_teams si se pasa, sino candidates)
        lookup = all_teams if all_teams else candidates
        forced = next((t for t in lookup if t["id"] == forced_id), None)
        if forced:
            disp = (forced.get("school") or {}).get("name", forced.get("name", "?")) \
                if isinstance(forced.get("school"), dict) else forced.get("name", "?")
            return forced["id"], disp, 1.0

    # Aplicar aliases: si el fixture_name contiene un alias conocido, usar su
    # valor como nombre de búsqueda en lugar del nombre original
    search_name = fixture_name
    fn_norm = normalize(fixture_name)
    for alias_key, alias_val in ALIASES.items():
        if alias_key in fn_norm:
            search_name = alias_val
            break

    # Detectar color (rojo/azul) en el nombre original del fixture
    color = None
    for c in ('rojo', 'azul'):
        if c in fixture_name.lower():
            color = c
            break

    def _best_in_pool(pool):
        best = (0.0, None)
        for team in pool:
            sc_name = (team.get("school") or {}).get("name", "") \
                if isinstance(team.get("school"), dict) else ""
            t_name = team.get("name") or ""
            s = max(word_score(search_name, sc_name),
                    word_score(search_name, t_name),
                    word_score(search_name, sc_name + " " + t_name))
            if s > best[0]:
                best = (s, team)
        return best

    if color:
        color_pool = []
        for t in candidates:
            sc_name = (t.get("school") or {}).get("name", "") \
                if isinstance(t.get("school"), dict) else ""
            t_name = t.get("name") or ""
            if color in (sc_name + " " + t_name).lower():
                color_pool.append(t)
        # Si el filtro de color eliminó todos los candidatos, usar pool completo
        score, team = _best_in_pool(color_pool if color_pool else candidates)
    else:
        score, team = _best_in_pool(candidates)

    if team is None:
        return None, f"no-match({fixture_name})", 0.0
    display = (team.get("school") or {}).get("name", team.get("name", "?")) \
        if isinstance(team.get("school"), dict) else team.get("name", "?")
    return team["id"], display, score


# ── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    dry_run = "--dry-run" in sys.argv
    clear   = "--clear"   in sys.argv

    print("Cargando datos de Supabase...")
    teams_raw = sb.table("teams").select("*").execute().data or []
    schools   = {s["id"]: s for s in (sb.table("schools").select("id,name").execute().data or [])}
    sports    = sb.table("sports").select("id,name").execute().data or []
    cats      = sb.table("categories").select("id,name,gender,sport_id").execute().data or []

    # Enrich teams with nested objects
    teams = []
    for t in teams_raw:
        t = dict(t)
        t["school"] = schools.get(t.get("school_id"), {"name": "?"})
        t["sport"]  = next((s for s in sports if s["id"] == t.get("sport_id")),  {"name": "?"})
        t["cat"]    = next((c for c in cats   if c["id"] == t.get("category_id")), {"name":"?","gender":"?","sport_id":""})
        teams.append(t)

    print(f"  {len(teams)} equipos · {len(cats)} categorías · {len(sports)} deportes\n")

    def find_sport(hint: str):
        h = hint.lower()
        # "Fútbol 7" no existe como deporte separado → usar "Fútbol"
        if "fútbol 7" in h or "futbol 7" in h:
            h = "fútbol"
        exact = [s for s in sports if s["name"].lower() == h]
        if exact:
            return exact[0]
        return next((s for s in sports if h in s["name"].lower()), None)

    def find_cat(sport_id: str, year: str, gender: str):
        return next((c for c in cats
                     if c.get("sport_id") == sport_id
                     and year in c.get("name", "")
                     and c.get("gender") == gender), None)

    def cat_teams(sport_id: str, cat_id: str):
        return [t for t in teams
                if t.get("sport_id") == sport_id and t.get("category_id") == cat_id]

    warnings = []
    all_rows = []

    for cat_def in CATS:
        label  = cat_def["label"]
        sport  = find_sport(cat_def["sport"])
        if not sport:
            print(f"  ❌ Deporte no encontrado: {cat_def['sport']}")
            continue
        cat = find_cat(sport["id"], cat_def["cat"], cat_def["gender"])
        if not cat:
            print(f"  ❌ Categoría no encontrada: {cat_def['sport']} {cat_def['cat']} {cat_def['gender']}")
            continue

        pool     = cat_teams(sport["id"], cat["id"])
        ok_cnt   = 0
        warn_cnt = 0

        for m in cat_def["matches"]:
            day, time_, a_name, b_name, loc, grp, phase = m

            date_str = DATES.get(day)
            if not date_str:
                warnings.append(f"  [{label}] Fecha desconocida: {day}")
                continue

            match_date = f"{date_str}T{time_}:00{TZ}"
            status     = "pending"   # único valor permitido por el check constraint
            group_name = (None if phase == "playoff"
                          else ("Intergrupo" if phase == "intergroup"
                                else (grp or None)))

            team_a = team_b = None

            def resolve_team(name, pool, label):
                """Busca en el pool de categoría; si no encuentra, busca en mismo deporte,
                luego en todos los equipos. Siempre verifica overrides explícitos primero."""
                tid, disp, sc = find_team(name, pool, all_teams=teams)
                if sc < 0.3:
                    # Fallback 1: mismo deporte, distinta categoría
                    same_sport = [t for t in teams if t.get("sport_id") == sport["id"]
                                  and t not in pool]
                    tid2, disp2, sc2 = find_team(name, same_sport, all_teams=teams)
                    if sc2 < 0.6:
                        # Fallback 2: cualquier equipo
                        tid2, disp2, sc2 = find_team(name, teams, all_teams=teams)
                    if sc2 >= 0.6:
                        warnings.append(
                            f"  [{label}] '{name}' → fallback fuera de categoria: "
                            f"{disp2} (score={sc2:.0%})"
                        )
                        return tid2, disp2, sc2
                return tid, disp, sc

            if a_name is not None:
                tid, disp, sc = resolve_team(a_name, pool, label)
                team_a = tid
                if sc < 0.3:
                    warnings.append(f"  [{label}] sin match '{a_name}' (score={sc:.0%})")
                    warn_cnt += 1
                else:
                    ok_cnt += 1

            if b_name is not None:
                tid, disp, sc = resolve_team(b_name, pool, label)
                team_b = tid
                if sc < 0.3:
                    warnings.append(f"  [{label}] sin match '{b_name}' (score={sc:.0%})")
                    warn_cnt += 1
                else:
                    ok_cnt += 1

            row = {
                "team_a":      team_a,
                "team_b":      team_b,
                "sport_id":    sport["id"],
                "category_id": cat["id"],
                "match_date":  match_date,
                "location":    loc,
                "status":      status,
                "group_name":  group_name,
                "phase":       phase,
            }
            all_rows.append(row)

        status_icon = "✅" if warn_cnt == 0 else "⚠️ "
        print(f"  {status_icon} {label}: {len(cat_def['matches'])} partidos "
              f"({ok_cnt} matches OK, {warn_cnt} sin match)")

    print(f"\n{'─'*60}")
    print(f"Total partidos preparados: {len(all_rows)}")

    if warnings:
        print("\n⚠️  ADVERTENCIAS:")
        for w in warnings:
            print(w)

    if dry_run:
        print("\n[--dry-run] No se insertó nada.")
        return

    confirm = input(f"\n¿{'Borrar existentes y ' if clear else ''}insertar {len(all_rows)} partidos? (s/n): ")
    if confirm.strip().lower() != 's':
        print("Cancelado.")
        return

    # ── Filtrar filas que causarían errores de constraint ─────────────────────
    valid_rows = []
    skipped = 0
    for row in all_rows:
        if row.get("team_a") is None or row.get("team_b") is None:
            skipped += 1
            warnings.append(
                f"  Saltado (team NULL): {row.get('phase','?')} "
                f"{row.get('match_date','?')} en {row.get('location','?')}"
            )
            continue
        if row.get("team_a") == row.get("team_b"):
            skipped += 1
            warnings.append(
                f"  Saltado (mismo equipo {row['team_a'][:8]}…): "
                f"{row.get('group_name','?')} {row.get('match_date','?')}"
            )
            continue
        valid_rows.append(row)

    if skipped:
        print(f"\n  ⚠️  {skipped} partidos saltados (equipos NULL o duplicados) — ver advertencias")

    if clear:
        print("Borrando partidos existentes...")
        sb.table("matches").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print("Borrados.")

    BATCH   = 50
    inserted = failed = 0
    all_rows = valid_rows

    for i in range(0, len(all_rows), BATCH):
        batch = all_rows[i:i + BATCH]
        try:
            sb.table("matches").insert(batch).execute()
            inserted += len(batch)
        except Exception as e:
            err = str(e)
            # Si group_name/phase no existen aún en la tabla, reintenta sin ellas
            if "group_name" in err or "phase" in err or "PGRST204" in err:
                stripped = [{k: v for k, v in r.items()
                             if k not in ("group_name", "phase")} for r in batch]
                try:
                    sb.table("matches").insert(stripped).execute()
                    inserted += len(batch)
                    if i == 0:
                        print("  ℹ️  Columnas group_name/phase no existen → insertando sin ellas")
                except Exception as e2:
                    print(f"  ❌ Batch {i//BATCH+1}: {e2}")
                    failed += len(batch)
            else:
                print(f"  ❌ Batch {i//BATCH+1}: {e}")
                failed += len(batch)

        if (i // BATCH + 1) % 5 == 0 or i + BATCH >= len(all_rows):
            print(f"  → {min(i+BATCH, len(all_rows))}/{len(all_rows)}")

    print(f"\n{'✅' if not failed else '⚠️ '} {inserted} insertados"
          + (f", {failed} fallidos" if failed else ""))

    # ── Actualizar teams.group_name desde partidos intragrupo insertados ─────
    print("\nActualizando grupos de equipos (teams.group_name)...")
    from collections import defaultdict

    # Paso 1: Limpiar group_name en TODOS los equipos (elimina datos obsoletos de runs anteriores)
    all_team_ids = [t["id"] for t in teams]
    cleared = 0
    for i in range(0, len(all_team_ids), 100):
        batch = all_team_ids[i:i + 100]
        try:
            sb.table("teams").update({"group_name": None}).in_("id", batch).execute()
            cleared += len(batch)
        except Exception as e:
            print(f"  ⚠️  Error limpiando grupos: {e}")
    print(f"  → {cleared} equipos con group_name limpiado")

    # Paso 2: Asignar grupo A o B solo a los equipos que realmente jugaron en esa fase
    by_group: dict[str, list] = defaultdict(list)
    seen: set = set()

    for row in all_rows:
        if row.get("phase") == "group" and row.get("group_name") in ("A", "B"):
            gname = row["group_name"]
            for key in ("team_a", "team_b"):
                tid = row.get(key)
                if tid and tid not in seen:
                    by_group[gname].append(tid)
                    seen.add(tid)

    grp_updated = 0
    for gname, team_ids in by_group.items():
        for i in range(0, len(team_ids), 100):
            batch_ids = team_ids[i:i + 100]
            try:
                sb.table("teams").update({"group_name": gname}).in_("id", batch_ids).execute()
                grp_updated += len(batch_ids)
            except Exception as e:
                print(f"  ⚠️  Error al actualizar grupo {gname}: {e}")

    print(f"  ✅ {grp_updated} equipos asignados a Grupo A o B")


if __name__ == "__main__":
    main()
