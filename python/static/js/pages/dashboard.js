/**
 * Página: Dashboard - Resumen del torneo
 */
const Pages = window.Pages || {};

Pages.Dashboard = async function(container, opts) {
  container.innerHTML = Utils.spinner();
  try {
    const [matches, schools, sports] = await Promise.all([
      Api.getMatches(),
      Api.getSchools(),
      Api.getSports(),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const liveMatches = matches.filter(m => m.status === 'live');
    const todayMatches = matches.filter(m => m.match_date && m.match_date.startsWith(today));
    const upcomingMatches = matches.filter(m => m.status === 'scheduled').slice(0, 5);
    const recentFinished = matches.filter(m => m.status === 'finished').slice(-5).reverse();

    container.innerHTML = `
      <div class="mb-6">
        <h2 class="text-3xl font-black" style="color:#60a5fa;">🏠 Dashboard</h2>
        <p class="text-gray-400 mt-1">Resumen del torneo Big Games 2026</p>
      </div>

      <!-- Stats rápidas -->
      <div class="grid grid-cols-2 gap-4 mb-8" style="grid-template-columns:repeat(4,1fr);">
        <div class="card text-center">
          <div class="stat-number">${matches.length}</div>
          <div class="text-gray-400 mt-1">Total Partidos</div>
        </div>
        <div class="card text-center">
          <div class="stat-number" style="color:#dc2626;">${liveMatches.length}</div>
          <div class="text-gray-400 mt-1">En Vivo</div>
        </div>
        <div class="card text-center">
          <div class="stat-number" style="color:#16a34a;">${matches.filter(m=>m.status==='finished').length}</div>
          <div class="text-gray-400 mt-1">Finalizados</div>
        </div>
        <div class="card text-center">
          <div class="stat-number" style="color:#f59e0b;">${schools.length}</div>
          <div class="text-gray-400 mt-1">Colegios</div>
        </div>
      </div>

      <div class="grid gap-6" style="grid-template-columns:1fr 1fr;">
        <!-- Partidos en vivo -->
        <div class="card">
          <h3 class="text-xl font-bold mb-4" style="color:#dc2626;">🔴 En Vivo</h3>
          ${liveMatches.length === 0 ? '<p class="text-gray-400">No hay partidos en vivo ahora</p>' :
            liveMatches.map(m => _matchCard(m, true)).join('')}
        </div>

        <!-- Partidos de hoy -->
        <div class="card">
          <h3 class="text-xl font-bold mb-4" style="color:#f59e0b;">📅 Hoy</h3>
          ${todayMatches.length === 0 ? '<p class="text-gray-400">No hay partidos programados hoy</p>' :
            todayMatches.slice(0, 5).map(m => _matchCard(m, false)).join('')}
        </div>

        <!-- Próximos partidos -->
        <div class="card">
          <h3 class="text-xl font-bold mb-4" style="color:#60a5fa;">🗓️ Próximos</h3>
          ${upcomingMatches.length === 0 ? '<p class="text-gray-400">No hay partidos próximos</p>' :
            upcomingMatches.map(m => _matchCard(m, false)).join('')}
        </div>

        <!-- Resultados recientes -->
        <div class="card">
          <h3 class="text-xl font-bold mb-4" style="color:#10b981;">✅ Resultados Recientes</h3>
          ${recentFinished.length === 0 ? '<p class="text-gray-400">No hay resultados aún</p>' :
            recentFinished.map(m => _matchCard(m, false)).join('')}
        </div>
      </div>

      <!-- Deportes del torneo -->
      <div class="card mt-6">
        <h3 class="text-xl font-bold mb-4">🏅 Deportes del Torneo</h3>
        <div class="flex flex-wrap gap-3">
          ${sports.map(s => `
            <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 16px;text-align:center;cursor:pointer;"
                 onclick="App.navigate('calendar')">
              <div style="font-size:24px;">${Utils.sportIcon(s.name)}</div>
              <div style="font-size:13px;margin-top:4px;color:#93c5fd;">${s.name}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error: ${e.message}</div>`;
  }
};

function _matchCard(m, showLiveBtn) {
  const s1 = m.team1?.school?.name || 'Equipo 1';
  const s2 = m.team2?.school?.name || 'Equipo 2';
  const sport = m.sport || '';
  const icon = Utils.sportIcon(sport);
  const statusBadge = Utils.statusBadge(m.status);
  const date = Utils.formatDateTime(m.match_date);

  return `
    <div class="table-row" style="border-radius:8px;padding:12px;margin-bottom:8px;background:rgba(255,255,255,0.03);cursor:pointer;"
         onclick="App.navigate('${m.status === 'live' ? 'liveScoring' : m.status === 'finished' ? 'results' : 'calendar'}', {matchId:'${m.id}'})">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <span style="font-size:13px;color:#94a3b8;">${icon} ${sport}</span>
          ${statusBadge}
        </div>
        <span style="font-size:12px;color:#64748b;">${date}</span>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
        <span style="font-weight:700;color:#e2e8f0;">${Utils.truncate(s1, 20)}</span>
        <span style="font-weight:900;font-size:18px;color:#60a5fa;padding:0 12px;">${m.team1_score ?? 0} - ${m.team2_score ?? 0}</span>
        <span style="font-weight:700;color:#e2e8f0;">${Utils.truncate(s2, 20)}</span>
      </div>
    </div>`;
}

window.Pages = Pages;
