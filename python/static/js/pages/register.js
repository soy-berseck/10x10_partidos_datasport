/**
 * Página: Registrar y gestionar jugadores
 */
Pages.Register = async function(container, opts) {
  container.innerHTML = Utils.spinner();
  try {
    const [teams, players] = await Promise.all([
      Api.getTeams(),
      Api.getPlayers(),
    ]);

    // Ordenar equipos por colegio + deporte
    teams.sort((a, b) => {
      const na = `${a.school?.name || ''} ${a.sport?.name || ''}`;
      const nb = `${b.school?.name || ''} ${b.sport?.name || ''}`;
      return na.localeCompare(nb);
    });

    window._rgData = { teams, players };

    const renderPage = () => {
      const { players: ps } = window._rgData;

      container.innerHTML = `
        <div class="mb-6">
          <h2 class="text-3xl font-black" style="color:#60a5fa;">👤 Jugadores</h2>
          <p class="text-gray-400 mt-1">Registrar y eliminar jugadores de los equipos</p>
        </div>

        ${!App.isEditor() ? `
          <div class="card" style="border:1px solid rgba(220,38,38,0.3);background:rgba(220,38,38,0.1);">
            <p style="color:#fca5a5;">⚠️ Solo los editores pueden modificar datos.</p>
          </div>` : `

        <!-- Formulario registrar jugador -->
        <div class="card mb-8">
          <h3 class="text-xl font-bold mb-4">➕ Registrar Jugador</h3>
          <div style="display:grid;grid-template-columns:2fr 1fr 2fr auto;gap:12px;align-items:end;max-width:800px;">
            <div>
              <label class="text-gray-400 text-sm block mb-1">Nombre completo *</label>
              <input type="text" id="rg-pname" class="input-field" placeholder="Nombre del jugador">
            </div>
            <div>
              <label class="text-gray-400 text-sm block mb-1">Camiseta</label>
              <input type="number" id="rg-jersey" class="input-field" placeholder="Nº" min="0" max="99">
            </div>
            <div>
              <label class="text-gray-400 text-sm block mb-1">Equipo *</label>
              <select id="rg-team" class="input-field">
                <option value="">Seleccionar equipo...</option>
                ${teams.map(t => {
                  const school = t.school?.name || 'Desconocido';
                  const sport  = t.sport?.name  || '';
                  const cat    = t.category?.name || '';
                  const gender = t.gender || t.category?.gender || '';
                  return `<option value="${t.id}">${school} — ${Utils.sportIcon(sport)} ${sport} ${cat} ${gender}</option>`;
                }).join('')}
              </select>
            </div>
            <button class="btn-primary" onclick="Pages._rgSave()">Guardar</button>
          </div>
        </div>
        `}

        <!-- Lista de jugadores por equipo -->
        <div id="rg-player-list">
          ${_rgRenderPlayers(ps, teams, App.isEditor())}
        </div>
      `;
    };

    Pages._rgSave = async () => {
      const full_name    = document.getElementById('rg-pname')?.value?.trim();
      const jersey_raw   = document.getElementById('rg-jersey')?.value;
      const team_id      = document.getElementById('rg-team')?.value;

      if (!full_name) { Utils.toast('El nombre es requerido', 'error'); return; }
      if (!team_id)   { Utils.toast('Selecciona un equipo', 'error'); return; }

      try {
        const created = await Api.createPlayer({
          full_name,
          jersey_number: jersey_raw ? parseInt(jersey_raw) : undefined,
          team_id,
        });
        window._rgData.players.push(created);
        document.getElementById('rg-pname').value  = '';
        document.getElementById('rg-jersey').value = '';
        document.getElementById('rg-team').value   = '';
        Utils.toast(`Jugador "${full_name}" registrado`);
        document.getElementById('rg-player-list').innerHTML =
          _rgRenderPlayers(window._rgData.players, teams, true);
      } catch(e) { Utils.toast(e.message, 'error'); }
    };

    Pages._rgDelete = async (playerId, playerName) => {
      if (!confirm(`¿Eliminar a "${playerName}"?`)) return;
      try {
        await Api.deletePlayer(playerId);
        window._rgData.players = window._rgData.players.filter(p => p.id !== playerId);
        Utils.toast(`"${playerName}" eliminado`);
        document.getElementById('rg-player-list').innerHTML =
          _rgRenderPlayers(window._rgData.players, teams, true);
      } catch(e) { Utils.toast(e.message, 'error'); }
    };

    Pages._rgEditJersey = (playerId, playerName, currentJersey) => {
      Utils.showModal(`
        <h3 class="text-xl font-bold mb-1">✏️ Editar Camiseta</h3>
        <p style="color:#94a3b8;font-size:14px;margin-bottom:16px;">${playerName}</p>
        <div style="display:flex;align-items:center;gap:12px;">
          <input type="number" id="jersey-edit-input" value="${currentJersey ?? ''}"
            placeholder="Nº" min="0" max="99"
            style="width:90px;font-size:24px;font-weight:900;text-align:center;
                   padding:8px;background:#1e293b;border:2px solid #3b82f6;
                   border-radius:8px;color:white;"
            onkeydown="if(event.key==='Enter') Pages._rgSaveJersey('${playerId}')">
          <button class="btn-primary" onclick="Pages._rgSaveJersey('${playerId}')">Guardar</button>
        </div>
      `);
      setTimeout(() => document.getElementById('jersey-edit-input')?.focus(), 50);
    };

    Pages._rgSaveJersey = async (playerId) => {
      const val = document.getElementById('jersey-edit-input')?.value;
      const jersey_number = val !== '' && val !== null ? parseInt(val) : null;
      try {
        const updated = await Api.updatePlayer(playerId, { jersey_number });
        const p = window._rgData.players.find(x => x.id === playerId);
        if (p) p.jersey_number = updated.jersey_number;
        Utils.closeModal();
        Utils.toast('Número de camiseta actualizado');
        document.getElementById('rg-player-list').innerHTML =
          _rgRenderPlayers(window._rgData.players, teams, true);
      } catch(e) { Utils.toast(e.message, 'error'); }
    };

    renderPage();
  } catch(e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error: ${e.message}</div>`;
  }
};

function _rgRenderPlayers(players, teams, isEditor) {
  if (teams.length === 0) return Utils.emptyState('No hay equipos registrados');

  const sections = teams.map(t => {
    const teamPlayers = players.filter(p => p.team_id === t.id);
    const school  = t.school?.name  || 'Desconocido';
    const sport   = t.sport?.name   || '';
    const cat     = t.category?.name || '';
    const gender  = t.gender || t.category?.gender || '';
    const color   = Utils.sportColor(sport);

    return `
      <div class="card mb-4" style="border-top:3px solid ${color};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div>
            <span style="font-weight:700;font-size:16px;">${school}</span>
            <span style="font-size:13px;color:#94a3b8;margin-left:10px;">
              ${Utils.sportIcon(sport)} ${sport} &bull; ${cat} &bull; ${gender}
            </span>
          </div>
          <span style="font-size:13px;color:${color};font-weight:700;">${teamPlayers.length} jugadores</span>
        </div>

        ${teamPlayers.length === 0
          ? `<p style="color:#64748b;font-size:13px;font-style:italic;">Sin jugadores registrados</p>`
          : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px;">
              ${teamPlayers
                .sort((a, b) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99))
                .map(p => `
                  <div style="display:flex;align-items:center;justify-content:space-between;
                              padding:8px 12px;background:rgba(255,255,255,0.03);
                              border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
                    <div style="display:flex;align-items:center;gap:10px;">
                      <button ${isEditor ? `onclick="Pages._rgEditJersey('${p.id}','${p.full_name.replace(/'/g, "\\'")}',${p.jersey_number ?? ''})"` : ''}
                        style="font-weight:900;font-size:18px;color:${color};min-width:34px;
                               background:none;border:none;cursor:${isEditor ? 'pointer' : 'default'};
                               padding:0;${isEditor ? 'text-decoration:underline dotted;' : ''}">
                        #${p.jersey_number ?? '?'}
                      </button>
                      <span style="font-size:14px;font-weight:600;">${p.full_name}</span>
                    </div>
                    ${isEditor ? `
                      <button class="btn-danger" style="font-size:11px;padding:4px 10px;"
                        onclick="Pages._rgDelete('${p.id}','${p.full_name.replace(/'/g, "\\'")}')">
                        Eliminar
                      </button>
                    ` : ''}
                  </div>
                `).join('')}
            </div>`
        }
      </div>`;
  }).join('');

  return sections || Utils.emptyState('No hay equipos registrados');
}

window.Pages = window.Pages || {};
window.Pages.Register = Pages.Register;
