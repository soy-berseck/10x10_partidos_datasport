/**
 * Página: Calendario - Vista de partidos con filtros
 */
Pages.Calendar = async function(container, opts) {
  container.innerHTML = Utils.spinner();
  try {
    const [matches, sports] = await Promise.all([
      Api.getMatches(),
      Api.getSports(),
    ]);

    let filterSport = '';
    let filterGender = '';
    let filterDate = '';
    let filterStatus = '';

    const render = (filtered) => {
      const matchesHtml = filtered.length === 0
        ? Utils.emptyState('No hay partidos con estos filtros')
        : filtered.map(m => _calMatchCard(m)).join('');
      document.getElementById('cal-matches-list').innerHTML = matchesHtml;
    };

    const applyFilters = () => {
      let f = matches;
      if (filterSport) f = f.filter(m => m.sport === filterSport);
      if (filterGender) f = f.filter(m => m.gender === filterGender);
      if (filterDate) f = f.filter(m => m.match_date && m.match_date.startsWith(filterDate));
      if (filterStatus) f = f.filter(m => m.status === filterStatus);
      render(f);
    };

    container.innerHTML = `
      <div class="mb-6 flex justify-between items-center">
        <div>
          <h2 class="text-3xl font-black" style="color:#60a5fa;">📅 Calendario</h2>
          <p class="text-gray-400 mt-1">${matches.length} partidos registrados</p>
        </div>
        ${App.isEditor() ? `<button class="btn-primary" onclick="_showAddMatch()">+ Agregar Partido</button>` : ''}
      </div>

      <!-- Filtros -->
      <div class="card mb-6" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
        <div>
          <label class="text-gray-400 text-sm">Deporte</label>
          <select class="input-field mt-1" id="f-sport" onchange="Pages._calFilter()">
            <option value="">Todos</option>
            ${sports.map(s => `<option value="${s.name}">${Utils.sportIcon(s.name)} ${s.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-gray-400 text-sm">Género</label>
          <select class="input-field mt-1" id="f-gender" onchange="Pages._calFilter()">
            <option value="">Todos</option>
            <option>Masculino</option><option>Femenino</option><option>Mixto</option>
          </select>
        </div>
        <div>
          <label class="text-gray-400 text-sm">Fecha</label>
          <input type="date" class="input-field mt-1" id="f-date" onchange="Pages._calFilter()">
        </div>
        <div>
          <label class="text-gray-400 text-sm">Estado</label>
          <select class="input-field mt-1" id="f-status" onchange="Pages._calFilter()">
            <option value="">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="live">En Vivo</option>
            <option value="finished">Finalizado</option>
          </select>
        </div>
      </div>

      <div id="cal-matches-list"></div>
    `;

    // Guardar contexto en closure para filtros
    Pages._calData = { matches, sports };
    Pages._calFilter = () => {
      const { matches: ms } = Pages._calData;
      const sport = document.getElementById('f-sport')?.value || '';
      const gender = document.getElementById('f-gender')?.value || '';
      const date = document.getElementById('f-date')?.value || '';
      const status = document.getElementById('f-status')?.value || '';
      let f = ms;
      if (sport) f = f.filter(m => m.sport === sport);
      if (gender) f = f.filter(m => m.gender === gender);
      if (date) f = f.filter(m => m.match_date && m.match_date.startsWith(date));
      if (status) f = f.filter(m => m.status === status);
      document.getElementById('cal-matches-list').innerHTML =
        f.length === 0 ? Utils.emptyState() : f.map(m => _calMatchCard(m)).join('');
    };

    render(matches);

    // Modal agregar partido (carga equipos al abrir)
    window._showAddMatch = async function() {
      const { sports: sp } = Pages._calData;
      Utils.showModal(`
        <h3 class="text-xl font-bold mb-4">➕ Agregar Partido</h3>
        <div class="grid gap-3">
          <div>
            <label class="text-gray-400 text-sm">Deporte</label>
            <select class="input-field mt-1" id="nm-sport">
              ${sp.map(s => `<option value="${s.name}">${s.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-gray-400 text-sm">Género</label>
            <select class="input-field mt-1" id="nm-gender">
              <option>Masculino</option><option>Femenino</option><option>Mixto</option>
            </select>
          </div>
          <div>
            <label class="text-gray-400 text-sm">Equipo Local</label>
            <select class="input-field mt-1" id="nm-t1"><option>Cargando...</option></select>
          </div>
          <div>
            <label class="text-gray-400 text-sm">Equipo Visitante</label>
            <select class="input-field mt-1" id="nm-t2"><option>Cargando...</option></select>
          </div>
          <div>
            <label class="text-gray-400 text-sm">Fecha y Hora</label>
            <input type="datetime-local" class="input-field mt-1" id="nm-date" value="${new Date().toISOString().slice(0,16)}">
          </div>
          <div>
            <label class="text-gray-400 text-sm">Lugar</label>
            <input type="text" class="input-field mt-1" id="nm-loc" placeholder="Cancha principal">
          </div>
          <button class="btn-primary mt-2" onclick="Pages._saveNewMatch()">Guardar Partido</button>
        </div>
      `);
      try {
        const ts = await Api.getTeams();
        const opts = ts.map(t => `<option value="${t.id}">${t.school?.name || ''} - ${t.sport?.name || ''}</option>`).join('');
        document.getElementById('nm-t1').innerHTML = opts;
        document.getElementById('nm-t2').innerHTML = opts;
      } catch(e) {
        document.getElementById('nm-t1').innerHTML = '<option>Error cargando equipos</option>';
        document.getElementById('nm-t2').innerHTML = '<option>Error cargando equipos</option>';
      }
    };

    Pages._saveNewMatch = async function() {
      const t1 = document.getElementById('nm-t1')?.value;
      const t2 = document.getElementById('nm-t2')?.value;
      const date = document.getElementById('nm-date')?.value;
      const loc = document.getElementById('nm-loc')?.value;

      if (!t1 || !t2 || t1 === t2) {
        Utils.toast('Selecciona dos equipos distintos', 'error'); return;
      }
      try {
        await Api.createMatch({ team_a: t1, team_b: t2, match_date: date, location: loc || 'Por definir', status: 'pending' });
        Utils.closeModal();
        Utils.toast('Partido creado exitosamente');
        App.navigate('calendar');
      } catch(e) {
        Utils.toast(e.message, 'error');
      }
    };

  } catch(e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error: ${e.message}</div>`;
  }
};

function _calMatchCard(m) {
  const s1 = m.team1?.school?.name || 'Equipo 1';
  const s2 = m.team2?.school?.name || 'Equipo 2';
  const sport = m.sport || '';
  const statusBadge = Utils.statusBadge(m.status);
  const date = Utils.formatDateTime(m.match_date);
  const icon = Utils.sportIcon(sport);

  let actions = '';
  if (m.status === 'live' || m.status === 'scheduled' || m.status === 'pending') {
    actions += `<button class="btn-primary" style="font-size:12px;padding:6px 12px;" onclick="App.navigate('liveScoring',{matchId:'${m.id}'})">🔴 En Vivo</button>`;
  }
  if (m.status === 'finished') {
    actions += `<button class="btn-secondary" style="font-size:12px;padding:6px 12px;" onclick="App.navigate('results',{matchId:'${m.id}'})">📊 Resultado</button>`;
  }

  return `
    <div class="card mb-3" style="border-left: 4px solid ${Utils.sportColor(sport)};">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="flex:1;">
          <div style="font-size:13px;color:#94a3b8;margin-bottom:8px;">${icon} ${sport} &bull; ${m.gender || ''} &bull; ${m.category || ''}</div>
          <div style="display:flex;align-items:center;gap:16px;">
            <span style="font-weight:700;font-size:16px;">${Utils.truncate(s1, 25)}</span>
            <span style="font-weight:900;font-size:22px;color:#60a5fa;padding:4px 16px;background:rgba(96,165,250,0.1);border-radius:8px;">${m.team1_score ?? 0} - ${m.team2_score ?? 0}</span>
            <span style="font-weight:700;font-size:16px;">${Utils.truncate(s2, 25)}</span>
          </div>
          <div style="margin-top:8px;font-size:12px;color:#64748b;">📅 ${date} &bull; 📍 ${m.location || 'Por definir'}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
          ${statusBadge}
          ${actions}
        </div>
      </div>
    </div>`;
}

window.Pages = Pages;
