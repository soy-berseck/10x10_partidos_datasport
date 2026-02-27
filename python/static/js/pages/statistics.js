/**
 * Página: Estadísticas - Jugadores y equipos
 */
Pages.Statistics = async function(container, opts) {
  container.innerHTML = Utils.spinner();
  try {
    const [playerStats, teamStats, sports] = await Promise.all([
      Api.getPlayerStats(),
      Api.getTeamStats(),
      Api.getSports(),
    ]);

    let activeTab = (opts && opts.tab) || 'scorers';

    const tabs = [
      { id: 'scorers', label: '⚽ Goleadores' },
      { id: 'assists', label: '🎯 Asistentes' },
      { id: 'cards', label: '🟨 Tarjetas' },
      { id: 'teams', label: '👥 Por Equipo' },
      { id: 'players', label: '🧑 Todos los Jugadores' },
    ];

    const renderTab = (tab) => {
      activeTab = tab;
      document.querySelectorAll('.stat-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tab);
      });
      const content = document.getElementById('stat-content');

      if (tab === 'scorers') {
        // Top goleadores: suma de score en todos los deportes
        const scorers = playerStats
          .map(p => ({
            ...p,
            totalScore: (p.sport_stats || []).reduce((a,s) => a + (s.score||0), 0),
          }))
          .filter(p => p.totalScore > 0)
          .sort((a,b) => b.totalScore - a.totalScore)
          .slice(0, 20);
        content.innerHTML = `
          <h3 class="text-xl font-bold mb-4">🏆 Top Goleadores / Anotadores</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="color:#94a3b8;font-size:13px;text-align:left;">
              <th style="padding:8px;">#</th>
              <th>Jugador</th><th>Equipo</th><th>Colegio</th><th style="text-align:center;">Anotaciones</th>
            </tr></thead>
            <tbody>
              ${scorers.map((p,i) => `
                <tr class="table-row" style="border-bottom:1px solid rgba(255,255,255,0.05);">
                  <td style="padding:10px;color:#f59e0b;font-weight:700;">${i+1}</td>
                  <td style="padding:10px;font-weight:600;">${p.name}</td>
                  <td style="padding:10px;color:#94a3b8;">${Utils.truncate(p.team_name,20)}</td>
                  <td style="padding:10px;color:#94a3b8;">${Utils.truncate(p.school,20)}</td>
                  <td style="padding:10px;text-align:center;font-weight:900;font-size:18px;color:#60a5fa;">${p.totalScore}</td>
                </tr>`).join('')}
            </tbody>
          </table>
          ${scorers.length === 0 ? Utils.emptyState('Sin estadísticas de goles') : ''}
        `;
      } else if (tab === 'assists') {
        const assists = playerStats
          .map(p => ({
            ...p,
            totalAssists: (p.sport_stats || []).reduce((a,s) => a + (s.assists||0), 0),
          }))
          .filter(p => p.totalAssists > 0)
          .sort((a,b) => b.totalAssists - a.totalAssists)
          .slice(0,20);
        content.innerHTML = `
          <h3 class="text-xl font-bold mb-4">🎯 Top Asistentes</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="color:#94a3b8;font-size:13px;">
              <th style="padding:8px;">#</th><th>Jugador</th><th>Colegio</th><th style="text-align:center;">Asistencias</th>
            </tr></thead>
            <tbody>
              ${assists.map((p,i) => `
                <tr class="table-row" style="border-bottom:1px solid rgba(255,255,255,0.05);">
                  <td style="padding:10px;color:#f59e0b;font-weight:700;">${i+1}</td>
                  <td style="padding:10px;font-weight:600;">${p.name}</td>
                  <td style="padding:10px;color:#94a3b8;">${Utils.truncate(p.school,22)}</td>
                  <td style="padding:10px;text-align:center;font-weight:900;font-size:18px;color:#10b981;">${p.totalAssists}</td>
                </tr>`).join('')}
            </tbody>
          </table>
          ${assists.length === 0 ? Utils.emptyState('Sin asistencias') : ''}
        `;
      } else if (tab === 'cards') {
        const cards = playerStats
          .filter(p => p.total_cards > 0)
          .sort((a,b) => b.total_cards - a.total_cards)
          .slice(0,20);
        content.innerHTML = `
          <h3 class="text-xl font-bold mb-4">🃏 Tarjetas</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="color:#94a3b8;font-size:13px;">
              <th style="padding:8px;">#</th><th>Jugador</th><th>Colegio</th>
              <th style="text-align:center;">🟨</th><th style="text-align:center;">🟥</th><th style="text-align:center;">Total</th>
            </tr></thead>
            <tbody>
              ${cards.map((p,i) => `
                <tr class="table-row" style="border-bottom:1px solid rgba(255,255,255,0.05);">
                  <td style="padding:10px;color:#f59e0b;font-weight:700;">${i+1}</td>
                  <td style="padding:10px;font-weight:600;">${p.name}</td>
                  <td style="padding:10px;color:#94a3b8;">${Utils.truncate(p.school,22)}</td>
                  <td style="padding:10px;text-align:center;color:#fbbf24;">${p.yellow_cards}</td>
                  <td style="padding:10px;text-align:center;color:#ef4444;">${p.red_cards}</td>
                  <td style="padding:10px;text-align:center;font-weight:700;">${p.total_cards}</td>
                </tr>`).join('')}
            </tbody>
          </table>
          ${cards.length === 0 ? Utils.emptyState('Sin tarjetas') : ''}
        `;
      } else if (tab === 'teams') {
        content.innerHTML = `
          <h3 class="text-xl font-bold mb-4">👥 Estadísticas por Equipo</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead><tr style="color:#94a3b8;font-size:12px;">
              <th style="padding:8px;text-align:left;">Equipo</th>
              <th style="padding:8px;text-align:left;">Deporte</th>
              <th style="text-align:center;">PJ</th><th style="text-align:center;">PG</th>
              <th style="text-align:center;">PE</th><th style="text-align:center;">PP</th>
              <th style="text-align:center;">GF</th><th style="text-align:center;">GC</th>
              <th style="text-align:center;">DIF</th><th style="text-align:center;">PTS</th>
            </tr></thead>
            <tbody>
              ${teamStats.map(t => `
                <tr class="table-row" style="border-bottom:1px solid rgba(255,255,255,0.05);">
                  <td style="padding:10px;font-weight:600;">${Utils.truncate(t.school,20)}</td>
                  <td style="padding:10px;color:#94a3b8;">${Utils.sportIcon(t.sport)} ${t.sport}</td>
                  <td style="padding:8px;text-align:center;">${t.matches_played}</td>
                  <td style="padding:8px;text-align:center;color:#10b981;">${t.wins}</td>
                  <td style="padding:8px;text-align:center;color:#94a3b8;">${t.draws}</td>
                  <td style="padding:8px;text-align:center;color:#ef4444;">${t.losses}</td>
                  <td style="padding:8px;text-align:center;">${t.goals_for}</td>
                  <td style="padding:8px;text-align:center;">${t.goals_against}</td>
                  <td style="padding:8px;text-align:center;color:${t.goal_difference>=0?'#10b981':'#ef4444'}">${t.goal_difference>0?'+':''}${t.goal_difference}</td>
                  <td style="padding:8px;text-align:center;font-weight:900;font-size:16px;color:#60a5fa;">${t.points}</td>
                </tr>`).join('')}
            </tbody>
          </table>
          ${teamStats.length === 0 ? Utils.emptyState('Sin estadísticas de equipos') : ''}
        `;
      } else if (tab === 'players') {
        content.innerHTML = `
          <h3 class="text-xl font-bold mb-4">🧑 Todos los Jugadores</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;">
            ${playerStats.map(p => `
              <div class="card" style="cursor:pointer;" onclick="App.navigate('players',{playerId:'${p.player_id}'})">
                <div style="font-weight:700;margin-bottom:4px;">${p.name}</div>
                <div style="font-size:13px;color:#94a3b8;">${Utils.truncate(p.school,22)} &bull; ${Utils.truncate(p.team_name,20)}</div>
                <div style="display:flex;gap:12px;margin-top:8px;font-size:13px;">
                  <span>⚽ ${(p.sport_stats||[]).reduce((a,s)=>a+(s.score||0),0)}</span>
                  <span>🎯 ${(p.sport_stats||[]).reduce((a,s)=>a+(s.assists||0),0)}</span>
                  <span>🟨 ${p.yellow_cards}</span>
                  <span>🟥 ${p.red_cards}</span>
                </div>
              </div>`).join('')}
          </div>
          ${playerStats.length === 0 ? Utils.emptyState('Sin jugadores') : ''}
        `;
      }
    };

    container.innerHTML = `
      <div class="mb-6">
        <h2 class="text-3xl font-black" style="color:#60a5fa;">📈 Estadísticas</h2>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;">
        ${tabs.map(t => `<button class="nav-tab stat-tab${activeTab===t.id?' active':''}" data-tab="${t.id}" onclick="Pages._statTab('${t.id}')">${t.label}</button>`).join('')}
      </div>
      <div id="stat-content" class="card"></div>
    `;

    Pages._statTab = renderTab;
    renderTab(activeTab);
  } catch(e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error: ${e.message}</div>`;
  }
};

window.Pages = Pages;
