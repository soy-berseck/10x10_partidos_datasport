/**
 * Página: Resultados - Partidos finalizados
 */
Pages.Results = async function(container, opts) {
  container.innerHTML = Utils.spinner();
  try {
    const [matches, players] = await Promise.all([
      Api.getMatches({ status: 'finished' }),
      Api.getPlayers(),
    ]);

    // Si viene con matchId, abrir detalle directo
    if (opts && opts.matchId) {
      const m = matches.find(m => m.id === opts.matchId) || await Api.getMatch(opts.matchId);
      if (m) { _showResultDetail(container, m, players); return; }
    }

    container.innerHTML = `
      <div class="mb-6">
        <h2 class="text-3xl font-black" style="color:#60a5fa;">📊 Resultados</h2>
        <p class="text-gray-400 mt-1">${matches.length} partidos finalizados</p>
      </div>
      ${matches.length === 0 ? Utils.emptyState('No hay resultados aún') :
        matches.map(m => `
          <div class="card mb-4" style="cursor:pointer;border-left:4px solid ${Utils.sportColor(m.sport)};"
               onclick="Pages._openResult('${m.id}')">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:13px;color:#94a3b8;">${Utils.sportIcon(m.sport)} ${m.sport} &bull; ${m.gender || ''}</div>
                <div style="display:flex;align-items:center;gap:16px;margin-top:8px;">
                  <span style="font-weight:700;font-size:16px;">${Utils.truncate(m.team1?.school?.name||'Equipo 1',22)}</span>
                  <span style="font-weight:900;font-size:26px;color:#10b981;">${m.team1_score} - ${m.team2_score}</span>
                  <span style="font-weight:700;font-size:16px;">${Utils.truncate(m.team2?.school?.name||'Equipo 2',22)}</span>
                </div>
                <div style="font-size:12px;color:#64748b;margin-top:6px;">📅 ${Utils.formatDateTime(m.match_date)} &bull; 📍 ${m.location||''}</div>
              </div>
              <span class="badge-finished">Finalizado</span>
            </div>
          </div>
        `).join('')}
    `;

    Pages._openResult = async (id) => {
      const m = matches.find(x => x.id === id) || await Api.getMatch(id);
      _showResultDetail(document.getElementById('page-content'), m, players);
    };

  } catch(e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error: ${e.message}</div>`;
  }
};

async function _showResultDetail(container, m, players) {
  const events = await Api.getEvents(m.id);
  const s1 = m.team1?.school?.name || 'Local';
  const s2 = m.team2?.school?.name || 'Visitante';
  const winner = m.team1_score > m.team2_score ? s1 : m.team2_score > m.team1_score ? s2 : 'Empate';

  container.innerHTML = `
    <div class="mb-4">
      <button class="btn-ghost" onclick="App.navigate('results')">← Volver</button>
    </div>
    <div class="card mb-6" style="text-align:center;border:2px solid #10b981;">
      <div style="font-size:13px;color:#94a3b8;margin-bottom:12px;">${Utils.sportIcon(m.sport)} ${m.sport} &bull; ${m.gender||''} &bull; ${m.category||''}</div>
      <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:20px;">
        <div>
          <div class="team-name-large">${s1}</div>
          ${m.team1_score > m.team2_score ? '<div style="color:#fbbf24;font-size:12px;margin-top:4px;">🏆 Ganador</div>' : ''}
        </div>
        <div>
          <div class="score-display">${m.team1_score} - ${m.team2_score}</div>
          <div style="color:#10b981;font-size:14px;margin-top:4px;">Partido Finalizado</div>
        </div>
        <div>
          <div class="team-name-large">${s2}</div>
          ${m.team2_score > m.team1_score ? '<div style="color:#fbbf24;font-size:12px;margin-top:4px;">🏆 Ganador</div>' : ''}
        </div>
      </div>
      <div style="font-size:12px;color:#64748b;margin-top:12px;">📅 ${Utils.formatDateTime(m.match_date)} &bull; 📍 ${m.location||''}</div>
    </div>
    <div class="card">
      <h3 class="text-xl font-bold mb-4">📋 Eventos del Partido</h3>
      ${events.length === 0 ? '<p class="text-gray-400">Sin eventos registrados</p>' :
        events.sort((a,b)=>(a.minute||0)-(b.minute||0)).map(e => {
          const p = players.find(x => x.id === e.player_id);
          const pName = p ? `#${p.jersey_number||'?'} ${p.full_name}` : '';
          const evLabels = {
            goal:'⚽ Gol',penalty:'⏸️ Penal',yellow_card:'🟨 Tarjeta Amarilla',red_card:'🟥 Tarjeta Roja',
            assist_football:'🎯 Asistencia',basket_1pt:'🏀 1pt',basket_2pts:'🏀 2pts',basket_3pts:'🏀 3pts',
            assist_basketball:'🎯 Asistencia',point_volleyball:'🏐 Punto',ace:'🎯 Ace',block:'🚫 Bloqueo',
            personal_foul:'❌ Falta Personal',technical_foul:'🚫 Falta Técnica',
            point_tennis_padel:'🎾 Punto',game_won:'🎮 Game',set_won:'🏆 Set',
          };
          return `
            <div style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <span style="color:#64748b;font-size:13px;min-width:35px;">${e.minute}'</span>
              <span style="font-weight:600;">${evLabels[e.event_type]||e.event_type}</span>
              ${pName ? `<span style="color:#94a3b8;font-size:13px;">${pName}</span>` : ''}
            </div>`;
        }).join('')}
    </div>
  `;
}

window.Pages = Pages;
