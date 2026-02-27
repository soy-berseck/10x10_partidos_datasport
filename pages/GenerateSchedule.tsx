import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

// ===== COURT DEFINITIONS =====
interface CourtInfo {
  id: string;
  name: string;
  location: string;
}

const COURTS: CourtInfo[] = [
  { id: 'monomeros_1',      name: 'Monómeros 1',            location: 'Polideportivo Hernán Celedón Manotas' },
  { id: 'monomeros_2',      name: 'Monómeros 2',            location: 'Polideportivo Hernán Celedón Manotas' },
  { id: 'solinilla_1',      name: 'Solinilla 1',            location: 'Centro Recreacional Solinilla' },
  { id: 'solinilla_2',      name: 'Solinilla 2',            location: 'Centro Recreacional Solinilla' },
  { id: 'solinilla_3',      name: 'Solinilla 3',            location: 'Centro Recreacional Solinilla' },
  { id: 'simon_bolivar',    name: 'U. Simón Bolívar Salgar', location: 'Universidad Simón Bolívar sede Salgar' },
  { id: 'british_1_f11',    name: 'British 1 Externa F11',  location: 'British International School' },
  { id: 'british_2_f7',     name: 'British 2 Interna F7',   location: 'British International School' },
  { id: 'british_basket_1', name: 'British Basket 1',       location: 'British International School' },
  { id: 'british_basket_2', name: 'British Basket 2',       location: 'British International School' },
  { id: 'marathon_gym',     name: 'Marathon Gym',           location: 'British International School' },
  { id: 'british_sol',      name: 'British Sol',            location: 'British International School' },
  { id: 'british_techo',    name: 'British Techo',          location: 'British International School' },
  { id: 'sugar_1',          name: 'Sugar 1',                location: 'Coliseo Sugar Baby Rojas' },
  { id: 'sugar_2',          name: 'Sugar 2',                location: 'Coliseo Sugar Baby Rojas' },
  { id: 'sugar_3',          name: 'Sugar 3',                location: 'Coliseo Sugar Baby Rojas' },
];

const courtById = (id: string): CourtInfo => COURTS.find(c => c.id === id) || { id, name: id, location: 'Por definir' };

// ===== AVAILABILITY WINDOWS =====
// Rule: last match must START at most 60 min before court closes
// So if court closes at 18:00, last start = 17:00 max
interface AvailWindow {
  date: string;   // 'YYYY-MM-DD'
  openH: number;  // opening hour
  openM: number;
  closeH: number; // closing hour
  closeM: number;
}

const FUTBOL_WINDOWS: AvailWindow[] = [
  { date: '2026-03-11', openH: 8,  openM: 0, closeH: 18, closeM: 0 },
  { date: '2026-03-12', openH: 8,  openM: 0, closeH: 18, closeM: 0 },
  { date: '2026-03-13', openH: 8,  openM: 0, closeH: 18, closeM: 0 },
  { date: '2026-03-14', openH: 8,  openM: 0, closeH: 14, closeM: 0 },
];

const SOLINILLA_WINDOWS: AvailWindow[] = [
  { date: '2026-03-10', openH: 13, openM: 0, closeH: 18, closeM: 0 },
  ...FUTBOL_WINDOWS,
];

// Voleibol fem/masc 2007-09: closes at 16:00 on Friday March 13
const VOLEIBOL_0709_WINDOWS: AvailWindow[] = [
  { date: '2026-03-06', openH: 13, openM: 30, closeH: 18, closeM: 0 },
  { date: '2026-03-07', openH: 8,  openM: 0,  closeH: 13, closeM: 0 },
  { date: '2026-03-09', openH: 15, openM: 0,  closeH: 18, closeM: 0 },
  { date: '2026-03-10', openH: 15, openM: 0,  closeH: 18, closeM: 0 },
  { date: '2026-03-11', openH: 8,  openM: 0,  closeH: 18, closeM: 0 },
  { date: '2026-03-12', openH: 8,  openM: 0,  closeH: 18, closeM: 0 },
  { date: '2026-03-13', openH: 8,  openM: 0,  closeH: 16, closeM: 0 }, // ⚠️ 16:00 deadline
  { date: '2026-03-14', openH: 8,  openM: 0,  closeH: 14, closeM: 0 },
];

// Voleibol 2010-11 and 2012-13: normal schedule (no 16:00 restriction on Friday)
const VOLEIBOL_GENERAL_WINDOWS: AvailWindow[] = [
  { date: '2026-03-06', openH: 13, openM: 30, closeH: 18, closeM: 0 },
  { date: '2026-03-07', openH: 8,  openM: 0,  closeH: 13, closeM: 0 },
  { date: '2026-03-09', openH: 15, openM: 0,  closeH: 18, closeM: 0 },
  { date: '2026-03-10', openH: 15, openM: 0,  closeH: 18, closeM: 0 },
  { date: '2026-03-11', openH: 8,  openM: 0,  closeH: 18, closeM: 0 },
  { date: '2026-03-12', openH: 8,  openM: 0,  closeH: 18, closeM: 0 },
  { date: '2026-03-13', openH: 8,  openM: 0,  closeH: 18, closeM: 0 },
  { date: '2026-03-14', openH: 8,  openM: 0,  closeH: 14, closeM: 0 },
];

// ===== CATEGORY CONFIGURATION =====
interface CategoryConfig {
  sport: string;
  gender: string;
  age: string;
  courts: string[];
  windows: AvailWindow[];
  intervalMinutes: number;       // time between match starts on same court
  matchDurationMinutes: number;  // actual match duration
  restMinutesAfterMatch: number; // min rest between end of one match and start of next (0 for volleyball)
  maxConsecutiveMatches: number; // max matches back-to-back (volleyball = 2, others = 99)
  numGroups: number;             // 1 or 2
  interGroupMatchesPerTeam: number; // additional cross-group matches per team
}

const CATEGORY_CONFIGS: CategoryConfig[] = [
  // --- FÚTBOL ---
  {
    sport: 'Fútbol', gender: 'Masculino', age: '2007-09',
    courts: ['monomeros_1'],
    windows: FUTBOL_WINDOWS,
    intervalMinutes: 70, matchDurationMinutes: 57, restMinutesAfterMatch: 60, maxConsecutiveMatches: 99,
    numGroups: 2, interGroupMatchesPerTeam: 2,
  },
  {
    sport: 'Fútbol', gender: 'Femenino', age: '2007-09',
    courts: ['monomeros_2'],
    windows: FUTBOL_WINDOWS,
    intervalMinutes: 70, matchDurationMinutes: 57, restMinutesAfterMatch: 60, maxConsecutiveMatches: 99,
    numGroups: 1, interGroupMatchesPerTeam: 0,
  },
  {
    sport: 'Fútbol', gender: 'Masculino', age: '2010-11',
    courts: ['solinilla_1', 'solinilla_2', 'solinilla_3'],
    windows: SOLINILLA_WINDOWS,
    intervalMinutes: 70, matchDurationMinutes: 57, restMinutesAfterMatch: 60, maxConsecutiveMatches: 99,
    numGroups: 2, interGroupMatchesPerTeam: 0,
  },
  {
    sport: 'Fútbol', gender: 'Femenino', age: '2010-11',
    courts: ['solinilla_2'],
    windows: FUTBOL_WINDOWS,
    intervalMinutes: 70, matchDurationMinutes: 57, restMinutesAfterMatch: 60, maxConsecutiveMatches: 99,
    numGroups: 1, interGroupMatchesPerTeam: 0,
  },
  {
    sport: 'Fútbol', gender: 'Masculino', age: '2012-13',
    courts: ['simon_bolivar', 'british_1_f11'],
    windows: FUTBOL_WINDOWS,
    intervalMinutes: 70, matchDurationMinutes: 57, restMinutesAfterMatch: 60, maxConsecutiveMatches: 99,
    numGroups: 2, interGroupMatchesPerTeam: 2,
  },
  {
    sport: 'Fútbol 7', gender: 'Femenino', age: '2012-13',
    courts: ['british_2_f7'],
    windows: FUTBOL_WINDOWS,
    intervalMinutes: 70, matchDurationMinutes: 57, restMinutesAfterMatch: 60, maxConsecutiveMatches: 99,
    numGroups: 1, interGroupMatchesPerTeam: 0,
  },
  // --- BALONCESTO ---
  {
    sport: 'Baloncesto', gender: 'Femenino', age: '2007-09',
    courts: ['british_basket_1', 'british_basket_2'],
    windows: FUTBOL_WINDOWS,
    intervalMinutes: 70, matchDurationMinutes: 47, restMinutesAfterMatch: 60, maxConsecutiveMatches: 99,
    numGroups: 1, interGroupMatchesPerTeam: 0,
  },
  {
    sport: 'Baloncesto', gender: 'Masculino', age: '2007-09',
    courts: ['british_basket_1', 'british_basket_2'],
    windows: FUTBOL_WINDOWS,
    intervalMinutes: 70, matchDurationMinutes: 47, restMinutesAfterMatch: 60, maxConsecutiveMatches: 99,
    numGroups: 1, interGroupMatchesPerTeam: 0,
  },
  {
    sport: 'Baloncesto', gender: 'Masculino', age: '2010-11',
    courts: ['british_basket_1', 'british_basket_2'],
    windows: FUTBOL_WINDOWS,
    intervalMinutes: 70, matchDurationMinutes: 47, restMinutesAfterMatch: 60, maxConsecutiveMatches: 99,
    numGroups: 2, interGroupMatchesPerTeam: 1,
  },
  {
    sport: 'Baloncesto', gender: 'Masculino', age: '2012-13',
    courts: ['british_basket_1', 'british_basket_2'],
    windows: FUTBOL_WINDOWS,
    intervalMinutes: 70, matchDurationMinutes: 47, restMinutesAfterMatch: 60, maxConsecutiveMatches: 99,
    numGroups: 1, interGroupMatchesPerTeam: 0,
  },
  // --- VOLEIBOL ---
  {
    sport: 'Voleibol', gender: 'Femenino', age: '2007-09',
    courts: ['marathon_gym', 'british_sol', 'sugar_1', 'sugar_2', 'sugar_3'],
    windows: VOLEIBOL_0709_WINDOWS,
    intervalMinutes: 75, matchDurationMinutes: 60, restMinutesAfterMatch: 0, maxConsecutiveMatches: 2,
    numGroups: 2, interGroupMatchesPerTeam: 1,
  },
  {
    sport: 'Voleibol', gender: 'Femenino', age: '2010-11',
    courts: ['marathon_gym', 'british_sol', 'sugar_1', 'sugar_2', 'sugar_3'],
    windows: VOLEIBOL_GENERAL_WINDOWS,
    intervalMinutes: 75, matchDurationMinutes: 60, restMinutesAfterMatch: 0, maxConsecutiveMatches: 2,
    numGroups: 2, interGroupMatchesPerTeam: 0,
  },
  {
    sport: 'Voleibol', gender: 'Femenino', age: '2012-13',
    courts: ['marathon_gym', 'british_techo'],
    windows: VOLEIBOL_GENERAL_WINDOWS,
    intervalMinutes: 75, matchDurationMinutes: 60, restMinutesAfterMatch: 0, maxConsecutiveMatches: 2,
    numGroups: 2, interGroupMatchesPerTeam: 1,
  },
  {
    sport: 'Voleibol', gender: 'Masculino', age: '2007-09',
    courts: ['marathon_gym', 'british_sol', 'sugar_1', 'sugar_2', 'sugar_3'],
    windows: VOLEIBOL_0709_WINDOWS,
    intervalMinutes: 75, matchDurationMinutes: 60, restMinutesAfterMatch: 0, maxConsecutiveMatches: 2,
    numGroups: 1, interGroupMatchesPerTeam: 0,
  },
];

// ===== SCHEDULING ALGORITHM =====

interface TeamInfo {
  id: string;
  school_name: string;
  sport_name: string;
  category_name: string;
  category_gender: string;
}

interface MatchToInsert {
  team1_id: string;
  team2_id: string;
  match_date: string;
  location: string;
  status: string;
  team1_score: number;
  team2_score: number;
  sport: string;
  category: string;
  gender: string;
}

function generateMatchesForTournament(teams: TeamInfo[]): { matches: MatchToInsert[]; warnings: string[] } {
  const allMatches: MatchToInsert[] = [];
  const warnings: string[] = [];

  // Global court occupancy: courtId -> Set of slot timestamps (in epoch minutes)
  const courtOccupied = new Map<string, Set<number>>();

  // Team tracking for rest constraints: teamId -> last match END time (epoch minutes)
  const teamLastMatchEnd = new Map<string, number>();

  // Volleyball consecutive tracking: teamId -> { lastSlotMin: number; consecutiveCount: number }
  const teamVolleyConsec = new Map<string, { lastSlotMin: number; count: number }>();

  // Convert date + hour + minute to epoch minutes (for comparison)
  function toEpochMins(date: string, h: number, m: number): number {
    return Math.floor(new Date(`${date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`).getTime() / 60000);
  }

  // Generate all valid slot times for a window
  function getSlotsForWindow(w: AvailWindow, intervalMins: number): Array<{ date: string; h: number; m: number; epochMins: number }> {
    const slots: Array<{ date: string; h: number; m: number; epochMins: number }> = [];
    let h = w.openH;
    let m = w.openM;
    const maxStartMins = w.closeH * 60 + w.closeM - 60; // last start = close - 60min

    while (true) {
      const totalMins = h * 60 + m;
      if (totalMins > maxStartMins) break;
      slots.push({ date: w.date, h, m, epochMins: toEpochMins(w.date, h, m) });
      const next = totalMins + intervalMins;
      h = Math.floor(next / 60);
      m = next % 60;
      if (h >= 24) break;
    }
    return slots;
  }

  // Check if a team can play at a given slot
  function canTeamPlay(teamId: string, slotEpochMins: number, cfg: CategoryConfig): boolean {
    if (cfg.restMinutesAfterMatch > 0) {
      // Football / Basketball: must rest N minutes after last match ENDS
      const lastEnd = teamLastMatchEnd.get(teamId);
      if (lastEnd !== undefined) {
        if (slotEpochMins < lastEnd + cfg.restMinutesAfterMatch) return false;
      }
    } else {
      // Volleyball: max consecutive matches rule
      const consec = teamVolleyConsec.get(teamId);
      if (consec && consec.count >= cfg.maxConsecutiveMatches) {
        // Team must have a gap (at least 1 interval) after their last match
        if (slotEpochMins <= consec.lastSlotMin + cfg.intervalMinutes) return false;
      }
    }
    return true;
  }

  // Record that a team played at a slot
  function recordTeamPlay(teamId: string, slotEpochMins: number, cfg: CategoryConfig) {
    if (cfg.restMinutesAfterMatch > 0) {
      teamLastMatchEnd.set(teamId, slotEpochMins + cfg.matchDurationMinutes);
    } else {
      const consec = teamVolleyConsec.get(teamId);
      if (!consec) {
        teamVolleyConsec.set(teamId, { lastSlotMin: slotEpochMins, count: 1 });
      } else {
        if (slotEpochMins <= consec.lastSlotMin + cfg.intervalMinutes) {
          // Consecutive match
          consec.count++;
          consec.lastSlotMin = slotEpochMins;
        } else {
          // Gap between matches - reset
          teamVolleyConsec.set(teamId, { lastSlotMin: slotEpochMins, count: 1 });
        }
      }
    }
  }

  // Find a slot for a match between two teams
  function findSlot(t1Id: string, t2Id: string, cfg: CategoryConfig, courtRobin: { idx: number }): MatchToInsert | null {
    for (const w of cfg.windows) {
      const slots = getSlotsForWindow(w, cfg.intervalMinutes);
      for (const slot of slots) {
        // Try courts in round-robin order
        for (let ci = 0; ci < cfg.courts.length; ci++) {
          const courtId = cfg.courts[(courtRobin.idx + ci) % cfg.courts.length];
          const occupied = courtOccupied.get(courtId) || new Set<number>();

          if (occupied.has(slot.epochMins)) continue;
          if (!canTeamPlay(t1Id, slot.epochMins, cfg)) continue;
          if (!canTeamPlay(t2Id, slot.epochMins, cfg)) continue;

          // Assign this slot
          occupied.add(slot.epochMins);
          courtOccupied.set(courtId, occupied);
          recordTeamPlay(t1Id, slot.epochMins, cfg);
          recordTeamPlay(t2Id, slot.epochMins, cfg);
          courtRobin.idx = (courtRobin.idx + ci + 1) % cfg.courts.length;

          const court = courtById(courtId);
          const timeStr = `${String(slot.h).padStart(2, '0')}:${String(slot.m).padStart(2, '0')}`;

          return {
            team1_id: t1Id,
            team2_id: t2Id,
            match_date: `${slot.date}T${timeStr}:00`,
            location: `${court.name} — ${court.location}`,
            status: 'scheduled',
            team1_score: 0,
            team2_score: 0,
            sport: cfg.sport,
            category: cfg.age,
            gender: cfg.gender,
          };
        }
      }
    }
    return null;
  }

  // Process each category configuration
  for (const cfg of CATEGORY_CONFIGS) {
    const categoryTeams = teams.filter(t =>
      t.sport_name === cfg.sport &&
      t.category_gender === cfg.gender &&
      t.category_name === cfg.age
    );

    if (categoryTeams.length < 2) continue;

    const courtRobin = { idx: 0 };

    // Split into groups
    const numGroups = Math.min(cfg.numGroups, categoryTeams.length);
    const groups: TeamInfo[][] = Array.from({ length: numGroups }, () => []);
    categoryTeams.forEach((team, i) => {
      groups[i % numGroups].push(team);
    });

    // Generate intra-group round-robin matches
    for (const group of groups) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const match = findSlot(group[i].id, group[j].id, cfg, courtRobin);
          if (match) {
            allMatches.push(match);
          } else {
            warnings.push(`⚠️ Sin slot para: ${group[i].school_name} vs ${group[j].school_name} (${cfg.sport} ${cfg.gender} ${cfg.age})`);
          }
        }
      }
    }

    // Generate inter-group matches if needed
    if (cfg.interGroupMatchesPerTeam > 0 && groups.length >= 2) {
      // For each team in group A, schedule N matches against teams in group B
      const [groupA, groupB] = [groups[0], groups[1]];
      const interMatches: Array<[string, string]> = [];

      for (let i = 0; i < groupA.length; i++) {
        for (let k = 0; k < cfg.interGroupMatchesPerTeam; k++) {
          const bIdx = (i + k) % groupB.length;
          const pair: [string, string] = [groupA[i].id, groupB[bIdx].id];
          // Avoid duplicate pairs
          const alreadyExists = interMatches.some(
            ([a, b]) => (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0])
          );
          if (!alreadyExists) {
            interMatches.push(pair);
          }
        }
      }

      for (const [t1Id, t2Id] of interMatches) {
        const match = findSlot(t1Id, t2Id, cfg, courtRobin);
        if (match) {
          allMatches.push(match);
        } else {
          warnings.push(`⚠️ Sin slot intergrupo: ${t1Id} vs ${t2Id} (${cfg.sport} ${cfg.gender} ${cfg.age})`);
        }
      }
    }
  }

  return { matches: allMatches, warnings };
}

// ===== REACT COMPONENT =====

interface GenerateScheduleProps {
  fetchData: () => Promise<void>;
  onNavigate: (page: any) => void;
}

const GenerateSchedule: React.FC<GenerateScheduleProps> = ({ fetchData, onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string[]>([]);
  const [result, setResult] = useState<{ success: boolean; count: number; warnings: string[] } | null>(null);

  const addStatus = (msg: string) => setStatus(prev => [...prev, msg]);

  const handleGenerate = async () => {
    setLoading(true);
    setStatus([]);
    setResult(null);

    try {
      // 1. Delete all existing matches
      addStatus('🗑️ Eliminando partidos existentes...');
      const { error: deleteError } = await supabase
        .from('matches')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) throw new Error(`Error al eliminar partidos: ${deleteError.message}`);
      addStatus('✅ Partidos anteriores eliminados.');

      // 2. Load all teams with their sport/category/gender
      addStatus('📋 Cargando equipos de Supabase...');
      const { data: teamsRaw, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          gender,
          school:schools(id, name),
          sport:sports(id, name),
          category:categories(id, name, gender)
        `);

      if (teamsError) throw new Error(`Error al cargar equipos: ${teamsError.message}`);
      if (!teamsRaw || teamsRaw.length === 0) throw new Error('No hay equipos registrados en la base de datos.');

      const teams: TeamInfo[] = teamsRaw.map((t: any) => ({
        id: t.id,
        school_name: t.school?.name || 'Desconocido',
        sport_name: t.sport?.name || '',
        category_name: t.category?.name || '',
        // Use team's own gender column as primary source, fall back to category gender
        category_gender: t.gender || t.category?.gender || '',
      }));

      // Count by category
      const categoryCounts: Record<string, number> = {};
      teams.forEach(t => {
        const key = `${t.sport_name} ${t.category_gender} ${t.category_name}`;
        categoryCounts[key] = (categoryCounts[key] || 0) + 1;
      });

      addStatus(`✅ ${teams.length} equipos cargados en ${Object.keys(categoryCounts).length} categorías:`);
      Object.entries(categoryCounts).forEach(([key, count]) => {
        addStatus(`   • ${key}: ${count} equipos`);
      });

      // 3. Generate matches
      addStatus('⚙️ Generando fixture...');
      const { matches, warnings } = generateMatchesForTournament(teams);
      addStatus(`✅ ${matches.length} partidos generados.`);

      if (warnings.length > 0) {
        addStatus(`⚠️ ${warnings.length} advertencias:`);
        warnings.slice(0, 10).forEach(w => addStatus(`   ${w}`));
        if (warnings.length > 10) addStatus(`   ... y ${warnings.length - 10} más.`);
      }

      // 4. Insert matches in batches
      addStatus('💾 Guardando partidos en Supabase...');
      const BATCH_SIZE = 50;
      let inserted = 0;
      for (let i = 0; i < matches.length; i += BATCH_SIZE) {
        const batch = matches.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase.from('matches').insert(batch);
        if (insertError) throw new Error(`Error al insertar partidos (lote ${Math.floor(i / BATCH_SIZE) + 1}): ${insertError.message}`);
        inserted += batch.length;
        addStatus(`   Guardados ${inserted}/${matches.length}...`);
      }

      addStatus('🎉 ¡Torneo generado exitosamente!');
      setResult({ success: true, count: matches.length, warnings });

      // 5. Refresh app data
      if (fetchData) await fetchData();

    } catch (err: any) {
      addStatus(`❌ Error: ${err.message}`);
      setResult({ success: false, count: 0, warnings: [err.message] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '30px 20px' }}>
      <h2 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--color-text)', marginBottom: '10px' }}>
        🏆 Generador Automático de Torneo
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '30px', fontSize: '15px', lineHeight: 1.6 }}>
        Este botón <strong>borrará todos los partidos actuales</strong> y generará el fixture completo del torneo
        Big Games 2026 con la <strong>sede correcta, horario y canchas</strong> asignadas a cada categoría,
        respetando las restricciones de descanso y disponibilidad de cada cancha.
      </p>

      {/* Sport rules summary */}
      <div style={{
        background: 'var(--color-cards)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '25px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text)', marginBottom: '12px' }}>
          📋 Reglas de programación aplicadas:
        </h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          <li style={{ marginBottom: '6px' }}>⚽ <strong>Fútbol:</strong> partidos cada 70 min — descanso mín. 60 min entre partidos del mismo equipo</li>
          <li style={{ marginBottom: '6px' }}>🏀 <strong>Baloncesto:</strong> partidos cada 70 min — descanso mín. 60 min entre partidos del mismo equipo</li>
          <li style={{ marginBottom: '6px' }}>🏐 <strong>Voleibol:</strong> partidos cada 75 min — máx. 2 partidos consecutivos por equipo</li>
          <li style={{ marginBottom: '6px' }}>📍 <strong>Canchas:</strong> cada categoría usa sus canchas asignadas según el reglamento</li>
          <li style={{ marginBottom: '6px' }}>⏰ <strong>Último partido:</strong> inicia mín. 1 hora antes del cierre de la sede</li>
          <li style={{ marginBottom: '6px' }}>🏐 <strong>Voleibol 2007-09:</strong> debe finalizar el viernes 13 máx. 16:00</li>
        </ul>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          width: '100%',
          padding: '18px 30px',
          fontSize: '20px',
          fontWeight: '700',
          background: loading
            ? 'rgba(255,255,255,0.1)'
            : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: loading ? 'none' : '0 4px 15px rgba(5,150,105,0.4)',
          transition: 'all 0.3s ease',
          marginBottom: '25px',
        }}
      >
        {loading ? '⏳ Generando torneo...' : '🔄 GENERAR TORNEO COMPLETO'}
      </button>

      {/* Status log */}
      {status.length > 0 && (
        <div style={{
          background: 'var(--color-cards)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          maxHeight: '350px',
          overflowY: 'auto',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            LOG DE PROCESO
          </h3>
          {status.map((msg, i) => (
            <p key={i} style={{
              margin: '3px 0',
              fontSize: '13px',
              fontFamily: 'monospace',
              color: msg.startsWith('❌') ? '#ef4444'
                : msg.startsWith('⚠️') ? '#f59e0b'
                : msg.startsWith('✅') || msg.startsWith('🎉') ? '#10b981'
                : 'var(--color-text-secondary)',
            }}>
              {msg}
            </p>
          ))}
        </div>
      )}

      {/* Result card */}
      {result && (
        <div style={{
          padding: '25px',
          borderRadius: '12px',
          background: result.success
            ? 'linear-gradient(135deg, rgba(5,150,105,0.2), rgba(16,185,129,0.1))'
            : 'rgba(239,68,68,0.15)',
          border: `2px solid ${result.success ? '#059669' : '#ef4444'}`,
          textAlign: 'center',
        }}>
          {result.success ? (
            <>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎉</div>
              <h3 style={{ fontSize: '22px', fontWeight: '900', color: '#10b981', marginBottom: '8px' }}>
                ¡Torneo Generado Exitosamente!
              </h3>
              <p style={{ fontSize: '18px', color: 'var(--color-text)', marginBottom: '15px' }}>
                <strong>{result.count}</strong> partidos programados con canchas y horarios correctos
              </p>
              {result.warnings.length > 0 && (
                <p style={{ fontSize: '13px', color: '#f59e0b', marginBottom: '15px' }}>
                  {result.warnings.length} partido(s) no pudieron ser programados por falta de slots disponibles
                </p>
              )}
              <button
                onClick={() => onNavigate('calendar')}
                style={{
                  background: '#059669',
                  color: 'white',
                  padding: '12px 30px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                📅 Ver Calendario
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>❌</div>
              <h3 style={{ fontSize: '22px', fontWeight: '900', color: '#ef4444' }}>
                Error al generar el torneo
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                Revisa el log de proceso para más detalles.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GenerateSchedule;
