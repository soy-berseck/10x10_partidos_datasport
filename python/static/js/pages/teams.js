/**
 * Página: Equipos - Muestra todos los equipos con logo del colegio
 */
Pages.Teams = async function(container, opts) {
  container.innerHTML = Utils.spinner();

  try {
    const [teams, players, sports] = await Promise.all([
      Api.getTeams(),
      Api.getPlayers(),
      Api.getSports(),
    ]);

    // Si viene navegando a un equipo específico
    if (opts && opts.teamId) {
      _renderTeamDetail(container, opts.teamId, teams, players);
      return;
    }

    // Guardar datos globalmente para los onclick
    window._teamsData = { teams, players };

    let filterSport = '';
    let filterGender = '';
    let searchText = '';

    const getFiltered = () => {
      let f = teams;
      if (filterSport) f = f.filter(t => t.sport?.name === filterSport);
      if (filterGender) f = f.filter(t => t.gender === filterGender || t.category?.gender === filterGender);
      if (searchText) {
        const q = searchText.toLowerCase();
        f = f.filter(t =>
          (t.school?.name || '').toLowerCase().includes(q) ||
          (t.sport?.name || '').toLowerCase().includes(q) ||
          (t.name || '').toLowerCase().includes(q)
        );
      }
      return f;
    };

    const renderList = () => {
      const filtered = getFiltered();
      const listEl = document.getElementById('teams-list');
      if (!listEl) return;

      if (filtered.length === 0) {
        listEl.innerHTML = Utils.emptyState('No se encontraron equipos');
        return;
      }

      listEl.innerHTML = `
        <p class="text-gray-400 mb-4" style="font-size:14px;">${filtered.length} equipos encontrados</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:20px;">
          ${filtered.map(t => _teamCard(t, players)).join('')}
        </div>`;
    };

    container.innerHTML = `
      <div class="mb-6">
        <h2 class="text-3xl font-black" style="color:#60a5fa;">👥 Equipos</h2>
        <p class="text-gray-400 mt-1">${teams.length} equipos registrados en el torneo</p>
      </div>

      <!-- Filtros -->
      <div class="card mb-6" style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:12px;align-items:end;">
        <div>
          <label class="text-gray-400 text-sm block mb-1">Buscar colegio o deporte</label>
          <input type="text" id="t-search" class="input-field" placeholder="🔍 Buscar..."
                 oninput="window._teamsFilter()">
        </div>
        <div>
          <label class="text-gray-400 text-sm block mb-1">Deporte</label>
          <select id="t-sport" class="input-field" onchange="window._teamsFilter()">
            <option value="">Todos los deportes</option>
            ${sports.map(s => `<option value="${s.name}">${Utils.sportIcon(s.name)} ${s.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-gray-400 text-sm block mb-1">Género</label>
          <select id="t-gender" class="input-field" onchange="window._teamsFilter()">
            <option value="">Todos</option>
            <option>Masculino</option>
            <option>Femenino</option>
            <option>Mixto</option>
          </select>
        </div>
        <button class="btn-ghost" onclick="window._teamsReset()">🔄</button>
      </div>

      <div id="teams-list"></div>
    `;

    // Funciones globales para los filtros y onclick
    window._teamsFilter = () => {
      filterSport  = document.getElementById('t-sport')?.value || '';
      filterGender = document.getElementById('t-gender')?.value || '';
      searchText   = document.getElementById('t-search')?.value || '';
      renderList();
    };

    window._teamsReset = () => {
      document.getElementById('t-sport').value = '';
      document.getElementById('t-gender').value = '';
      document.getElementById('t-search').value = '';
      filterSport = filterGender = searchText = '';
      renderList();
    };

    window._openTeam = (teamId) => {
      const { teams: ts, players: ps } = window._teamsData;
      _renderTeamDetail(document.getElementById('page-content'), teamId, ts, ps);
    };

    renderList();

  } catch (e) {
    console.error('Error en Teams:', e);
    container.innerHTML = `<div class="card" style="border:1px solid #dc2626;color:#fca5a5;padding:20px;">
      ⚠️ Error cargando equipos: ${e.message}
    </div>`;
  }
};

// ─── Tarjeta de equipo con logo ──────────────────────────────────────────────
function _teamCard(t, players) {
  const schoolName = t.school?.name || 'Desconocido';
  const sportName  = t.sport?.name  || '';
  const catName    = t.category?.name || '';
  const gender     = t.gender || t.category?.gender || '';
  const logoUrl    = t.school?.logo_url || null;
  const count      = players.filter(p => p.team_id === t.id).length;
  const color      = Utils.sportColor(sportName);
  const icon       = Utils.sportIcon(sportName);

  // Logo o iniciales
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}"
            alt="${schoolName}"
            style="width:72px;height:72px;border-radius:50%;object-fit:contain;
                   background:white;padding:6px;border:3px solid ${color};"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
       <div style="display:none;width:72px;height:72px;border-radius:50%;
                   background:linear-gradient(135deg,${color},#1e40af);
                   align-items:center;justify-content:center;
                   font-size:22px;font-weight:900;color:white;border:3px solid ${color};">
         ${Utils.schoolInitials(schoolName)}
       </div>`
    : `<div style="width:72px;height:72px;border-radius:50%;
                   background:linear-gradient(135deg,${color},#1e40af);
                   display:flex;align-items:center;justify-content:center;
                   font-size:22px;font-weight:900;color:white;border:3px solid ${color};">
         ${Utils.schoolInitials(schoolName)}
       </div>`;

  return `
    <div class="card" style="cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;
                              border-top:4px solid ${color};"
         onclick="window._openTeam('${t.id}')"
         onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 8px 30px rgba(0,0,0,0.4)'"
         onmouseout="this.style.transform='';this.style.boxShadow=''">

      <!-- Logo + Nombre -->
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;">
        ${logoHtml}
        <div style="flex:1;min-width:0;">
          <div style="font-weight:800;font-size:15px;color:white;
                      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${schoolName}
          </div>
          <div style="font-size:13px;color:#94a3b8;margin-top:2px;">
            ${icon} ${sportName}
          </div>
        </div>
      </div>

      <!-- Separador -->
      <div style="border-top:1px solid rgba(255,255,255,0.07);margin-bottom:12px;"></div>

      <!-- Detalles -->
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:12px;color:#64748b;">${catName}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">
            ${gender === 'Masculino' ? '🔵' : gender === 'Femenino' ? '🔴' : '🟣'} ${gender}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:26px;font-weight:900;color:${color};">${count}</div>
          <div style="font-size:11px;color:#64748b;">jugadores</div>
        </div>
      </div>
    </div>`;
}

// ─── Detalle de un equipo ─────────────────────────────────────────────────────
function _renderTeamDetail(container, teamId, teams, players) {
  const team = teams.find(t => t.id === teamId);
  if (!team) {
    container.innerHTML = '<div class="text-red-400 p-8">Equipo no encontrado</div>';
    return;
  }

  const schoolName = team.school?.name || 'Desconocido';
  const sportName  = team.sport?.name  || '';
  const catName    = team.category?.name || '';
  const gender     = team.gender || '';
  const logoUrl    = team.school?.logo_url || null;
  const color      = Utils.sportColor(sportName);
  const teamPlayers = players.filter(p => p.team_id === teamId);

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${schoolName}"
            style="width:110px;height:110px;border-radius:50%;object-fit:contain;
                   background:white;padding:10px;border:4px solid ${color};
                   box-shadow:0 0 30px rgba(0,0,0,0.4);"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
       <div style="display:none;width:110px;height:110px;border-radius:50%;
                   background:linear-gradient(135deg,${color},#1e40af);
                   align-items:center;justify-content:center;font-size:36px;
                   font-weight:900;color:white;border:4px solid ${color};">
         ${Utils.schoolInitials(schoolName)}
       </div>`
    : `<div style="width:110px;height:110px;border-radius:50%;
                   background:linear-gradient(135deg,${color},#1e40af);
                   display:flex;align-items:center;justify-content:center;font-size:36px;
                   font-weight:900;color:white;border:4px solid ${color};">
         ${Utils.schoolInitials(schoolName)}
       </div>`;

  container.innerHTML = `
    <div class="mb-4">
      <button class="btn-ghost" onclick="App.navigate('teams')">← Volver a Equipos</button>
    </div>

    <!-- Header del equipo -->
    <div class="card mb-6" style="border-top:5px solid ${color};
                                   background:linear-gradient(135deg,rgba(30,41,59,1),rgba(15,23,42,0.8));">
      <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;">
        ${logoHtml}
        <div>
          <div style="font-size:13px;color:${color};font-weight:700;letter-spacing:1px;text-transform:uppercase;">
            ${Utils.sportIcon(sportName)} ${sportName}
          </div>
          <h2 style="font-size:28px;font-weight:900;color:white;margin:8px 0 4px;">
            ${schoolName}
          </h2>
          <div style="color:#94a3b8;font-size:14px;">${catName} &bull; ${gender}</div>
          <div style="margin-top:12px;display:flex;gap:20px;">
            <div style="text-align:center;">
              <div style="font-size:28px;font-weight:900;color:${color};">${teamPlayers.length}</div>
              <div style="font-size:12px;color:#64748b;">Jugadores</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Plantel -->
    <div class="card">
      <h3 class="text-xl font-bold mb-5">👤 Plantel</h3>
      ${teamPlayers.length === 0
        ? Utils.emptyState('Sin jugadores registrados en este equipo')
        : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;">
            ${teamPlayers.map(p => `
              <div class="card" style="text-align:center;cursor:pointer;padding:16px;
                                       border-top:3px solid ${color};"
                   onclick="App.navigate('players',{playerId:'${p.id}'})"
                   onmouseover="this.style.background='rgba(255,255,255,0.05)'"
                   onmouseout="this.style.background=''">
                <img src="${p.photo_url || 'https://via.placeholder.com/60'}"
                     style="width:64px;height:64px;border-radius:50%;object-fit:cover;
                            margin:0 auto 8px;border:2px solid ${color};"
                     onerror="this.src='https://via.placeholder.com/60'">
                <div style="font-size:26px;font-weight:900;color:${color};">
                  #${p.jersey_number ?? '?'}
                </div>
                <div style="font-weight:600;font-size:13px;margin-top:4px;
                            overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                  ${p.full_name}
                </div>
              </div>`).join('')}
          </div>`}
    </div>
  `;
}

window.Pages = window.Pages || {};
window.Pages.Teams = Pages.Teams;
