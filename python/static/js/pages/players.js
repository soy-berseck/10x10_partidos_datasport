/**
 * Página: Jugadores
 */
Pages.Players = async function(container, opts) {
  container.innerHTML = Utils.spinner();
  try {
    const [players, teams, playerStats, sports] = await Promise.all([
      Api.getPlayers(),
      Api.getTeams(),
      Api.getPlayerStats(),
      Api.getSports(),
    ]);

    if (opts && opts.playerId) {
      _showPlayerDetail(container, opts.playerId, players, teams, playerStats);
      return;
    }

    let filterSport = '';
    let filterSchool = '';
    let search = '';

    const schools = [...new Set(teams.map(t => t.school?.name).filter(Boolean))].sort();

    const getFiltered = () => {
      let f = players;
      if (filterSport) {
        const tIds = teams.filter(t => t.sport?.name === filterSport).map(t => t.id);
        f = f.filter(p => tIds.includes(p.team_id));
      }
      if (filterSchool) {
        const tIds = teams.filter(t => t.school?.name === filterSchool).map(t => t.id);
        f = f.filter(p => tIds.includes(p.team_id));
      }
      if (search) {
        const q = search.toLowerCase();
        f = f.filter(p => p.full_name.toLowerCase().includes(q));
      }
      return f;
    };

    const renderList = () => {
      const f = getFiltered();
      document.getElementById('players-list').innerHTML = f.length === 0
        ? Utils.emptyState('No se encontraron jugadores')
        : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">
          ${f.map(p => {
            const team = teams.find(t => t.id === p.team_id);
            const sport = team?.sport?.name || '';
            const school = team?.school?.name || '';
            const pStats = playerStats.find(s => s.player_id === p.id);
            const totalScore = (pStats?.sport_stats || []).reduce((a,s) => a+(s.score||0), 0);
            return `
              <div class="card" style="cursor:pointer;text-align:center;" onclick="Pages._openPlayer('${p.id}')">
                <img src="${p.photo_url||'https://via.placeholder.com/60'}"
                     style="width:64px;height:64px;border-radius:50%;object-fit:cover;margin:0 auto 8px;border:2px solid ${Utils.sportColor(sport)};">
                <div style="font-weight:700;">${p.full_name}</div>
                <div style="font-size:28px;font-weight:900;color:#60a5fa;">#${p.jersey_number||'?'}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:4px;">${Utils.sportIcon(sport)} ${Utils.truncate(school,20)}</div>
                ${pStats ? `<div style="font-size:12px;margin-top:6px;display:flex;justify-content:center;gap:10px;">
                  <span>⚽${totalScore}</span>
                  <span>🟨${pStats.yellow_cards}</span>
                  <span>🟥${pStats.red_cards}</span>
                </div>` : ''}
              </div>`;
          }).join('')}
        </div>`;
    };

    container.innerHTML = `
      <div class="mb-6 flex justify-between items-center">
        <div>
          <h2 class="text-3xl font-black" style="color:#60a5fa;">⚽ Jugadores</h2>
          <p class="text-gray-400 mt-1">${players.length} jugadores registrados</p>
        </div>
      </div>
      <div class="card mb-6" style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;">
        <div>
          <input type="text" class="input-field" id="pl-search" placeholder="🔍 Buscar jugador..." oninput="Pages._plFilter()">
        </div>
        <div>
          <select class="input-field" id="pl-sport" onchange="Pages._plFilter()">
            <option value="">Todos los deportes</option>
            ${sports.map(s => `<option value="${s.name}">${Utils.sportIcon(s.name)} ${s.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <select class="input-field" id="pl-school" onchange="Pages._plFilter()">
            <option value="">Todos los colegios</option>
            ${schools.map(s => `<option value="${s}">${Utils.truncate(s,25)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="players-list"></div>
    `;

    Pages._plData = { players, teams, playerStats };
    Pages._plFilter = () => {
      filterSport = document.getElementById('pl-sport')?.value || '';
      filterSchool = document.getElementById('pl-school')?.value || '';
      search = document.getElementById('pl-search')?.value || '';
      renderList();
    };
    Pages._openPlayer = (id) => _showPlayerDetail(document.getElementById('page-content'), id, players, teams, playerStats);

    renderList();
  } catch(e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error: ${e.message}</div>`;
  }
};

function _showPlayerDetail(container, playerId, players, teams, playerStats) {
  const player = players.find(p => p.id === playerId);
  if (!player) { container.innerHTML = '<div class="text-red-400">Jugador no encontrado</div>'; return; }
  const team = teams.find(t => t.id === player.team_id);
  const sport = team?.sport?.name || '';
  const school = team?.school?.name || '';
  const pStats = playerStats.find(s => s.player_id === playerId);
  const totalScore = (pStats?.sport_stats || []).reduce((a,s) => a+(s.score||0), 0);
  const totalAssists = (pStats?.sport_stats || []).reduce((a,s) => a+(s.assists||0), 0);

  container.innerHTML = `
    <div class="mb-4"><button class="btn-ghost" onclick="App.navigate('players')">← Volver</button></div>
    <div class="card mb-6" style="display:flex;gap:24px;align-items:center;">
      <img src="${player.photo_url||'https://via.placeholder.com/100'}"
           style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid ${Utils.sportColor(sport)};">
      <div>
        <h2 style="font-size:28px;font-weight:900;color:white;">${player.full_name}</h2>
        <div style="font-size:42px;font-weight:900;color:#60a5fa;">#${player.jersey_number||'?'}</div>
        <div style="color:#94a3b8;font-size:14px;">${Utils.sportIcon(sport)} ${sport} &bull; ${Utils.truncate(school,25)}</div>
        ${team ? `<div style="color:#64748b;font-size:13px;margin-top:4px;">${Utils.truncate(team.category?.name||'',20)} &bull; ${team.gender||''}</div>` : ''}
      </div>
    </div>
    ${pStats ? `
      <div class="grid gap-4 mb-6" style="grid-template-columns:repeat(4,1fr);">
        <div class="card text-center">
          <div class="stat-number">${totalScore}</div>
          <div class="text-gray-400">Anotaciones</div>
        </div>
        <div class="card text-center">
          <div class="stat-number" style="color:#10b981;">${totalAssists}</div>
          <div class="text-gray-400">Asistencias</div>
        </div>
        <div class="card text-center">
          <div class="stat-number" style="color:#fbbf24;">${pStats.yellow_cards}</div>
          <div class="text-gray-400">🟨 Amarillas</div>
        </div>
        <div class="card text-center">
          <div class="stat-number" style="color:#ef4444;">${pStats.red_cards}</div>
          <div class="text-gray-400">🟥 Rojas</div>
        </div>
      </div>
      ${(pStats.sport_stats||[]).length > 0 ? `
        <div class="card">
          <h3 class="text-xl font-bold mb-4">📊 Stats por Deporte</h3>
          ${pStats.sport_stats.map(ss => `
            <div style="border-bottom:1px solid rgba(255,255,255,0.05);padding:12px 0;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <span style="font-weight:700;">${Utils.sportIcon(ss.sport)} ${ss.sport}</span>
                <span style="color:#94a3b8;font-size:13px;margin-left:8px;">${ss.score_term||'Puntos'}</span>
              </div>
              <div style="display:flex;gap:16px;font-size:14px;">
                <span>⚽ ${ss.score}</span>
                <span>🎯 ${ss.assists}</span>
                ${ss.three_pointers ? `<span>🏀 3pt: ${ss.three_pointers}</span>` : ''}
                ${ss.blocks ? `<span>🚫 Bloqueos: ${ss.blocks}</span>` : ''}
              </div>
            </div>`).join('')}
        </div>` : ''}
    ` : '<p class="text-gray-400">Sin estadísticas disponibles</p>'}
  `;
}

window.Pages = Pages;
