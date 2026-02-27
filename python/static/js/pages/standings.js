/**
 * Página: Standings - Tabla de posiciones
 */
Pages.Standings = async function(container, opts) {
  container.innerHTML = Utils.spinner();
  try {
    const [sports, categories] = await Promise.all([
      Api.getSports(),
      Api.getCategories(),
    ]);

    // Intentar usar la tabla team_standings (actualizada por trigger de Supabase)
    // Si está vacía o falla, calcular en tiempo real desde los partidos
    let standings = [];
    try {
      standings = await Api.getTeamStandings();
    } catch(e) {}
    if (!standings || standings.length === 0) {
      standings = await Api.getStandings();
    }

    let filterSport = '';
    let filterCategory = '';
    let filterGender = '';

    const render = (data) => {
      // Agrupar por deporte
      const bySport = {};
      data.forEach(t => {
        const key = `${t.sport} - ${t.category} - ${t.gender}`;
        if (!bySport[key]) bySport[key] = { sport: t.sport, category: t.category, gender: t.gender, teams: [] };
        bySport[key].teams.push(t);
      });

      const content = Object.entries(bySport).map(([key, group]) => `
        <div class="card mb-6">
          <h3 class="text-lg font-bold mb-3" style="color:#93c5fd;">
            ${Utils.sportIcon(group.sport)} ${group.sport} &bull; ${group.category} &bull; ${group.gender}
          </h3>
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;min-width:600px;">
              <thead>
                <tr style="color:#64748b;font-size:12px;text-align:center;">
                  <th style="padding:8px;text-align:left;">#</th>
                  <th style="text-align:left;">Equipo / Colegio</th>
                  <th>PJ</th><th>PG</th><th>PE</th><th>PP</th>
                  <th>GF</th><th>GC</th><th>DIF</th>
                  <th style="color:#fbbf24;font-size:14px;">PTS</th>
                </tr>
              </thead>
              <tbody>
                ${group.teams.map((t, i) => `
                  <tr class="table-row" style="border-bottom:1px solid rgba(255,255,255,0.05);">
                    <td style="padding:10px;font-weight:700;color:${i===0?'#fbbf24':i===1?'#94a3b8':i===2?'#b87333':'#e2e8f0'}">${i+1}</td>
                    <td style="padding:10px;">
                      <span style="font-weight:600;">${Utils.truncate(t.school,22)}</span>
                      <span style="font-size:12px;color:#64748b;display:block;">${Utils.truncate(t.team_name,25)}</span>
                    </td>
                    <td style="padding:10px;text-align:center;">${t.matches_played}</td>
                    <td style="padding:10px;text-align:center;color:#10b981;font-weight:700;">${t.wins}</td>
                    <td style="padding:10px;text-align:center;color:#94a3b8;">${t.draws}</td>
                    <td style="padding:10px;text-align:center;color:#ef4444;">${t.losses}</td>
                    <td style="padding:10px;text-align:center;">${t.goals_for}</td>
                    <td style="padding:10px;text-align:center;">${t.goals_against}</td>
                    <td style="padding:10px;text-align:center;color:${t.goal_difference>=0?'#10b981':'#ef4444'};">${t.goal_difference>0?'+':''}${t.goal_difference}</td>
                    <td style="padding:10px;text-align:center;font-weight:900;font-size:18px;color:#60a5fa;">${t.points}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`).join('');
      document.getElementById('standings-content').innerHTML = content || Utils.emptyState('Sin datos de tabla de posiciones');
    };

    container.innerHTML = `
      <div class="mb-6">
        <h2 class="text-3xl font-black" style="color:#60a5fa;">🏆 Tablas de Posiciones</h2>
      </div>
      <!-- Filtros -->
      <div class="card mb-6" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
        <div>
          <label class="text-gray-400 text-sm">Deporte</label>
          <select class="input-field mt-1" id="st-sport" onchange="Pages._stFilter()">
            <option value="">Todos los deportes</option>
            ${sports.map(s => `<option value="${s.name}">${Utils.sportIcon(s.name)} ${s.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-gray-400 text-sm">Género</label>
          <select class="input-field mt-1" id="st-gender" onchange="Pages._stFilter()">
            <option value="">Todos</option>
            <option>Masculino</option><option>Femenino</option><option>Mixto</option>
          </select>
        </div>
        <div style="display:flex;align-items:flex-end;">
          <button class="btn-ghost" onclick="Pages._stReset()">🔄 Limpiar filtros</button>
        </div>
      </div>
      <div id="standings-content"></div>
    `;

    Pages._stData = standings;
    Pages._stFilter = () => {
      const sport = document.getElementById('st-sport')?.value || '';
      const gender = document.getElementById('st-gender')?.value || '';
      let f = Pages._stData;
      if (sport) f = f.filter(t => t.sport === sport);
      if (gender) f = f.filter(t => t.gender === gender);
      render(f);
    };
    Pages._stReset = () => {
      document.getElementById('st-sport').value = '';
      document.getElementById('st-gender').value = '';
      render(Pages._stData);
    };

    render(standings);
  } catch(e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error: ${e.message}</div>`;
  }
};

window.Pages = Pages;
