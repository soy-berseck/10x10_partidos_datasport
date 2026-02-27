/**
 * Página: Live Scoring - Gestión de partidos en tiempo real
 */

// Eventos disponibles por deporte
const _LV_EVENTS = {
  'Fútbol': [
    { type: 'gol',              label: '⚽ Gol',            scores: true  },
    { type: 'tarjeta_amarilla', label: '🟨 T. Amarilla',    scores: false },
    { type: 'tarjeta_roja',     label: '🟥 T. Roja',        scores: false },
  ],
  'Fútbol 7': [
    { type: 'gol',              label: '⚽ Gol',            scores: true  },
    { type: 'tarjeta_amarilla', label: '🟨 T. Amarilla',    scores: false },
    { type: 'tarjeta_roja',     label: '🟥 T. Roja',        scores: false },
  ],
  'Baloncesto': [
    { type: 'rebote',           label: '🏀 Rebote',         scores: false },
    { type: 'bloqueo',          label: '🛡️ Bloqueo',        scores: false },
    { type: 'falta_tecnica',    label: '🚫 Falta Técnica',  scores: false },
  ],
  'Voleibol': [
    { type: 'recepcion',        label: '🏐 Recepción',      scores: false },
  ],
};

// Etiquetas para historial (incluye tipos legacy)
const _LV_LABELS = {
  gol:              '⚽ Gol',
  tarjeta_amarilla: '🟨 Tarjeta Amarilla',
  tarjeta_roja:     '🟥 Tarjeta Roja',
  rebote:           '🏀 Rebote',
  bloqueo:          '🛡️ Bloqueo',
  falta_tecnica:    '🚫 Falta Técnica',
  recepcion:        '🏐 Recepción',
  // legacy
  goal:             '⚽ Gol',
  yellow_card:      '🟨 Tarjeta Amarilla',
  red_card:         '🟥 Tarjeta Roja',
  personal_foul:    '❌ Falta Personal',
  basket_2pts:      '🏀 Canasta 2pts',
  basket_3pts:      '🏀 Canasta 3pts',
  point_volleyball: '🏐 Punto',
};

Pages.LiveScoring = async function(container, opts) {
  container.innerHTML = Utils.spinner();
  try {
    const [matches, teams, players] = await Promise.all([
      Api.getMatches(),
      Api.getTeams(),
      Api.getPlayers(),
    ]);

    if (opts && opts.matchId) {
      await _lvDetail(container, opts.matchId, matches, players);
      return;
    }

    // ── Vista listado ────────────────────────────────────────────────────────
    const sports = [...new Set(matches.map(m => m.sport).filter(Boolean))];
    let fSport = '', fStatus = '';

    const getFiltered = () => {
      let f = matches;
      if (fSport)  f = f.filter(m => m.sport === fSport);
      if (fStatus) f = f.filter(m => m.status === fStatus);
      return f;
    };

    const renderList = () => {
      const el = document.getElementById('lv-list');
      if (!el) return;
      const filtered = getFiltered();
      el.innerHTML = filtered.length === 0
        ? Utils.emptyState('No hay partidos con los filtros seleccionados')
        : filtered.map(_lvCard).join('');
    };

    container.innerHTML = `
      <div class="mb-6">
        <h2 class="text-3xl font-black" style="color:#dc2626;">🔴 En Vivo</h2>
        <p class="text-gray-400 mt-1">Gestión de partidos en tiempo real</p>
      </div>
      <div class="card mb-6" style="display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end;">
        <div>
          <label class="text-gray-400 text-sm block mb-1">Deporte</label>
          <select id="lv-sport" class="input-field" onchange="window._lvFilter()">
            <option value="">Todos los deportes</option>
            ${sports.map(s => `<option value="${s}">${Utils.sportIcon(s)} ${s}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-gray-400 text-sm block mb-1">Estado</label>
          <select id="lv-status" class="input-field" onchange="window._lvFilter()">
            <option value="">Todos</option>
            <option value="pending">Programado</option>
            <option value="live">En Vivo</option>
            <option value="finished">Finalizado</option>
          </select>
        </div>
        <button class="btn-ghost" onclick="window._lvReset()">🔄</button>
      </div>
      <div id="lv-list"></div>
    `;

    window._lvFilter = () => {
      fSport  = document.getElementById('lv-sport')?.value  || '';
      fStatus = document.getElementById('lv-status')?.value || '';
      renderList();
    };
    window._lvReset = () => {
      document.getElementById('lv-sport').value  = '';
      document.getElementById('lv-status').value = '';
      fSport = fStatus = '';
      renderList();
    };

    renderList();
  } catch(e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error: ${e.message}</div>`;
  }
};

function _lvCard(m) {
  const s1     = m.team1?.school?.name || 'Equipo 1';
  const s2     = m.team2?.school?.name || 'Equipo 2';
  const border = m.status === 'live' ? '#dc2626' : m.status === 'finished' ? '#6b7280' : '#3b82f6';
  return `
    <div class="card mb-4" style="border-left:4px solid ${border};">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <div style="font-size:13px;color:#94a3b8;">${Utils.sportIcon(m.sport)} ${m.sport} &bull; ${m.gender || ''} &bull; ${m.category || ''}</div>
          <div style="display:flex;align-items:center;gap:16px;margin-top:10px;">
            <span style="font-weight:700;font-size:17px;">${Utils.truncate(s1, 22)}</span>
            <span style="font-weight:900;font-size:26px;color:#60a5fa;">${m.team1_score ?? 0} - ${m.team2_score ?? 0}</span>
            <span style="font-weight:700;font-size:17px;">${Utils.truncate(s2, 22)}</span>
          </div>
          <div style="margin-top:6px;font-size:12px;color:#64748b;">📅 ${Utils.formatDateTime(m.match_date)} &bull; 📍 ${m.location || ''}</div>
        </div>
        <div style="text-align:center;">
          ${Utils.statusBadge(m.status)}
          <div style="margin-top:8px;">
            <button class="btn-primary" style="font-size:13px;"
              onclick="App.navigate('liveScoring',{matchId:'${m.id}'})">Gestionar →</button>
          </div>
        </div>
      </div>
    </div>`;
}

async function _lvDetail(container, matchId, allMatches, allPlayers) {
  container.innerHTML = Utils.spinner();
  try {
    let match = allMatches.find(m => m.id === matchId);
    if (!match) match = await Api.getMatch(matchId);
    if (!match) {
      container.innerHTML = '<div class="text-red-400 p-8">Partido no encontrado</div>';
      return;
    }

    let events = [];
    try { events = await Api.getEvents(matchId); } catch(e) {}

    const sport     = match.sport || '';
    const sportEvts = _LV_EVENTS[sport] || [];
    const isEditor  = App.isEditor();
    const s1 = match.team1?.school?.name || 'Equipo Local';
    const s2 = match.team2?.school?.name || 'Equipo Visitante';

    const render = () => {
      const sc1    = match.team1_score ?? 0;
      const sc2    = match.team2_score ?? 0;
      const border = match.status === 'live' ? '#dc2626' : match.status === 'finished' ? '#6b7280' : '#1e40af';

      container.innerHTML = `
        <div class="mb-4">
          <button class="btn-ghost" onclick="App.navigate('liveScoring')">← Volver</button>
        </div>

        <!-- Marcador principal -->
        <div class="card mb-6" style="border:2px solid ${border};text-align:center;">
          ${Utils.statusBadge(match.status)}
          <div style="font-size:13px;color:#94a3b8;margin-top:6px;">
            ${Utils.sportIcon(sport)} ${sport} &bull; ${match.gender || ''} &bull; ${match.category || ''}
          </div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">
            📍 ${match.location || ''} &bull; 📅 ${Utils.formatDateTime(match.match_date)}
          </div>

          <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;margin-top:24px;">
            <div style="text-align:right;">
              <div style="font-weight:800;font-size:18px;">${s1}</div>
              ${isEditor && match.status === 'live' ? `
                <input type="number" id="sc1" value="${sc1}" min="0"
                  style="width:64px;margin-top:10px;text-align:center;font-size:18px;
                         padding:6px;background:#1e293b;border:1px solid #334155;
                         border-radius:8px;color:white;">
              ` : ''}
            </div>
            <div style="font-size:56px;font-weight:900;color:#60a5fa;line-height:1;">${sc1} - ${sc2}</div>
            <div style="text-align:left;">
              <div style="font-weight:800;font-size:18px;">${s2}</div>
              ${isEditor && match.status === 'live' ? `
                <input type="number" id="sc2" value="${sc2}" min="0"
                  style="width:64px;margin-top:10px;text-align:center;font-size:18px;
                         padding:6px;background:#1e293b;border:1px solid #334155;
                         border-radius:8px;color:white;">
              ` : ''}
            </div>
          </div>

          ${isEditor ? `
            <div style="display:flex;justify-content:center;gap:10px;margin-top:24px;flex-wrap:wrap;">
              ${match.status === 'pending' ? `
                <button class="btn-primary" onclick="window._lvStart()">▶️ Iniciar Partido</button>
              ` : ''}
              ${match.status === 'live' ? `
                <button class="btn-secondary" onclick="window._lvSaveScore()">💾 Guardar Marcador</button>
                <button class="btn-danger" onclick="window._lvFinish()">🏁 Finalizar Partido</button>
              ` : ''}
            </div>
          ` : ''}
        </div>

        ${isEditor && match.status === 'live' && sportEvts.length > 0 ? `
        <!-- Botones de evento -->
        <div class="card mb-6">
          <h3 class="text-xl font-bold mb-4">⚡ Registrar Evento</h3>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            ${sportEvts.map(ev => `
              <button class="btn-secondary"
                onclick="window._lvStartEvent('${ev.type}','${ev.label}',${ev.scores})">
                ${ev.label}
              </button>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Historial de eventos -->
        <div class="card">
          <h3 class="text-xl font-bold mb-4">📋 Historial de Eventos</h3>
          <div id="lv-ev-list">
            ${_lvEventRows(events, allPlayers, isEditor)}
          </div>
        </div>
      `;
    };

    render();

    // ── Handlers ──────────────────────────────────────────────────────────────

    window._lvStart = async () => {
      if (!confirm('¿Iniciar el partido?')) return;
      try {
        await Api.updateMatch(matchId, { status: 'live' });
        match.status = 'live';
        Utils.toast('Partido iniciado');
        render();
      } catch(e) { Utils.toast(e.message, 'error'); }
    };

    window._lvFinish = async () => {
      if (!confirm('¿Finalizar el partido? Se actualizará la tabla de posiciones.')) return;
      try {
        const sc1 = parseInt(document.getElementById('sc1')?.value ?? match.team1_score ?? 0);
        const sc2 = parseInt(document.getElementById('sc2')?.value ?? match.team2_score ?? 0);

        // Paso 1: finalizar el partido (status). Siempre debe funcionar.
        await Api.updateMatch(matchId, { status: 'finished' });
        match.status = 'finished';

        // Paso 2: guardar scores por separado (falla si las columnas no existen aún en Supabase).
        try {
          await Api.updateMatch(matchId, { team1_score: sc1, team2_score: sc2 });
          match.team1_score = sc1;
          match.team2_score = sc2;
        } catch(scoreErr) { /* columnas opcionales, ignorar */ }

        Utils.toast('Partido finalizado');
        render();
      } catch(e) { Utils.toast(e.message || 'Error al finalizar', 'error'); }
    };

    window._lvSaveScore = async () => {
      try {
        const sc1 = parseInt(document.getElementById('sc1')?.value ?? 0);
        const sc2 = parseInt(document.getElementById('sc2')?.value ?? 0);
        await Api.updateMatch(matchId, { team1_score: sc1, team2_score: sc2 });
        match.team1_score = sc1;
        match.team2_score = sc2;
        Utils.toast('Marcador guardado');
        render();
      } catch(e) {
        Utils.toast('Para guardar marcador, agrega columnas team1_score/team2_score en Supabase', 'error');
      }
    };

    // Paso 1: seleccionar equipo
    window._lvStartEvent = (evType, evLabel, updatesScore) => {
      Utils.showModal(`
        <h3 class="text-xl font-bold mb-4">${evLabel}</h3>
        <p class="text-gray-400 mb-4">Selecciona el equipo:</p>
        <div style="display:grid;gap:10px;">
          <button class="btn-primary"
            onclick="window._lvPickPlayer('${evType}',${updatesScore},'${match.team1_id}')">
            ${s1}
          </button>
          <button class="btn-secondary"
            onclick="window._lvPickPlayer('${evType}',${updatesScore},'${match.team2_id}')">
            ${s2}
          </button>
        </div>
      `);
    };

    // Paso 2: seleccionar jugador
    window._lvPickPlayer = (evType, updatesScore, teamId) => {
      const teamPlayers = allPlayers.filter(p => p.team_id === teamId);
      const teamName    = teamId === match.team1_id ? s1 : s2;
      const noPlayers   = teamPlayers.length === 0;
      Utils.showModal(`
        <h3 class="text-xl font-bold mb-2">${_LV_LABELS[evType] || evType} — ${teamName}</h3>
        ${noPlayers ? `
          <div style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);
                      border-radius:8px;padding:10px 14px;margin-bottom:12px;">
            <p style="color:#fbbf24;font-size:13px;">⚠️ Este equipo no tiene jugadores registrados.</p>
            <p style="color:#94a3b8;font-size:12px;margin-top:4px;">Ve a <strong>Registrar → Jugador</strong> para agregar jugadores al equipo.</p>
          </div>
        ` : `<p class="text-gray-400 text-sm mb-3">Selecciona el jugador:</p>`}
        <div style="display:grid;gap:8px;max-height:320px;overflow-y:auto;">
          <button class="btn-ghost"
            onclick="window._lvSaveEvent('${evType}',${updatesScore},'${teamId}',null)">
            Sin jugador específico
          </button>
          ${teamPlayers.map(p => `
            <button class="btn-ghost"
              style="text-align:left;display:flex;align-items:center;gap:10px;"
              onclick="window._lvSaveEvent('${evType}',${updatesScore},'${teamId}','${p.id}')">
              <span style="font-weight:700;color:#60a5fa;min-width:32px;">#${p.jersey_number ?? '?'}</span>
              <span>${p.full_name}</span>
            </button>
          `).join('')}
        </div>
      `);
    };

    // Paso 3: guardar evento
    window._lvSaveEvent = async (evType, updatesScore, teamId, playerId) => {
      try {
        await Api.createEvent({
          match_id:   matchId,
          event_type: evType,
          team_id:    teamId,
          player_id:  playerId || null,
          minute:     0,
        });

        if (updatesScore) {
          const isT1 = teamId === match.team1_id;
          const sc1  = (match.team1_score ?? 0) + (isT1 ? 1 : 0);
          const sc2  = (match.team2_score ?? 0) + (isT1 ? 0 : 1);
          await Api.updateMatch(matchId, { team1_score: sc1, team2_score: sc2 });
          match.team1_score = sc1;
          match.team2_score = sc2;
        }

        Utils.closeModal();
        Utils.toast('Evento registrado');
        try { events = await Api.getEvents(matchId); } catch(e) {}
        render();
      } catch(e) {
        Utils.toast(e.message, 'error');
      }
    };

    // Eliminar evento (revierte gol si aplica)
    window._lvDeleteEvent = async (evId, evType, teamId) => {
      if (!confirm('¿Eliminar este evento?')) return;
      try {
        if (evType === 'gol') {
          const isT1 = teamId === match.team1_id;
          const sc1  = Math.max(0, (match.team1_score ?? 0) - (isT1 ? 1 : 0));
          const sc2  = Math.max(0, (match.team2_score ?? 0) - (isT1 ? 0 : 1));
          await Api.updateMatch(matchId, { team1_score: sc1, team2_score: sc2 });
          match.team1_score = sc1;
          match.team2_score = sc2;
        }
        await Api.deleteEvent(evId);
        Utils.toast('Evento eliminado');
        try { events = await Api.getEvents(matchId); } catch(e) {}
        render();
      } catch(e) {
        Utils.toast(e.message, 'error');
      }
    };

  } catch(e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error: ${e.message}</div>`;
  }
}

function _lvEventRows(events, players, isEditor) {
  if (!events || events.length === 0) {
    return '<p class="text-gray-400">Sin eventos registrados</p>';
  }
  return events
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .map(ev => {
      const p     = players.find(pl => pl.id === ev.player_id);
      const pName = p ? `#${p.jersey_number ?? '?'} ${p.full_name}` : '';
      const label = _LV_LABELS[ev.event_type] || ev.event_type;
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:10px;border-radius:6px;border-bottom:1px solid rgba(255,255,255,0.05);">
          <div style="display:flex;gap:10px;align-items:center;">
            <span style="font-weight:600;">${label}</span>
            ${pName ? `<span style="color:#94a3b8;font-size:13px;">${pName}</span>` : ''}
          </div>
          ${isEditor ? `
            <button class="btn-danger" style="font-size:11px;padding:4px 8px;"
              onclick="window._lvDeleteEvent('${ev.id}','${ev.event_type}','${ev.team_id || ''}')">✕</button>
          ` : ''}
        </div>`;
    }).join('');
}

window.Pages = window.Pages || {};
window.Pages.LiveScoring = Pages.LiveScoring;
