/**
 * Página: Generar Torneo Big Games 2026
 */
Pages.Schedule = async function(container, opts) {
  container.innerHTML = Utils.spinner();
  try {
    if (!App.isEditor()) {
      container.innerHTML = `
        <div class="mb-6">
          <h2 class="text-3xl font-black" style="color:#60a5fa;">🏆 Generar Torneo</h2>
        </div>
        <div class="card" style="border:1px solid rgba(220,38,38,0.3);background:rgba(220,38,38,0.1);">
          <p style="color:#fca5a5;">⚠️ Solo los editores pueden generar el torneo.</p>
        </div>`;
      return;
    }

    // Intentar cargar preview — no bloquear si falla
    let preview = { groups: [], total_expected_matches: 0 };
    try {
      preview = await Api.getSchedulePreview();
    } catch(e) {
      console.warn('Preview no disponible:', e.message);
    }

    // Contar partidos existentes
    let existingCount = 0;
    try {
      const existing = await Api.getMatches();
      existingCount = existing.length;
    } catch(e) {}

    container.innerHTML = `
      <div class="mb-6">
        <h2 class="text-3xl font-black" style="color:#60a5fa;">🏆 Generar Torneo Big Games 2026</h2>
        <p class="text-gray-400 mt-1">Genera todos los partidos todos contra todos respetando deportes, categorías, canchas y horarios</p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;">

        <!-- Config -->
        <div class="card" style="border-top:4px solid #3b82f6;">
          <h3 class="text-xl font-bold mb-4">⚙️ Opciones</h3>

          <!-- Partidos actuales -->
          ${existingCount > 0 ? `
          <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);
                      border-radius:8px;padding:12px;margin-bottom:16px;">
            <p style="font-size:13px;color:#fbbf24;font-weight:600;">
              ⚠️ Hay ${existingCount} partidos actualmente en la base de datos
            </p>
            <p style="font-size:12px;color:#94a3b8;margin-top:4px;">
              Al generar el torneo, se borrarán todos antes de crear los nuevos.
            </p>
          </div>` : `
          <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);
                      border-radius:8px;padding:12px;margin-bottom:16px;">
            <p style="font-size:13px;color:#6ee7b7;font-weight:600;">✅ No hay partidos actualmente — tabla limpia</p>
          </div>`}

          <!-- Info automática -->
          <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);
                      border-radius:8px;padding:12px;margin-bottom:16px;">
            <p style="font-size:13px;color:#93c5fd;font-weight:600;margin-bottom:6px;">✅ Configuración automática Big Games 2026</p>
            <ul style="font-size:12px;color:#94a3b8;line-height:1.8;margin:0;padding-left:16px;">
              <li>⚽ Fútbol: 57 min/partido · intervalo 70 min · canchas por categoría</li>
              <li>🏀 Baloncesto: 47 min/partido · intervalo 70 min · British Basket 1 y 2</li>
              <li>🏐 Voleibol: 75 min/partido · intervalo 75 min · canchas asignadas</li>
              <li>🗓️ Voleibol desde 6 mar · Fútbol/Basket desde 11 mar</li>
              <li>⏰ Último partido inicia máx. 1 h antes del cierre</li>
            </ul>
          </div>

          <button id="sc-btn" class="btn-primary"
                  style="width:100%;font-size:18px;padding:16px;font-weight:800;letter-spacing:0.5px;"
                  onclick="window._scheduleGenerate()">
            🗓️ ${existingCount > 0 ? 'Borrar y Regenerar Torneo' : 'Generar Torneo Completo'}
          </button>
        </div>

        <!-- Preview de grupos -->
        <div class="card" style="border-top:4px solid #8b5cf6;">
          <h3 class="text-xl font-bold mb-2">📊 Vista previa de grupos</h3>
          ${preview.groups.length > 0 ? `
          <p class="text-gray-400 text-sm mb-4">
            <strong style="color:white;">${preview.total_expected_matches}</strong> partidos totales en
            <strong style="color:white;">${preview.groups.length}</strong> grupos
          </p>
          <div style="max-height:460px;overflow-y:auto;">
            ${_scRenderGroups(preview.groups)}
          </div>` : `
          <p class="text-gray-400 text-sm mt-2">
            ${preview.groups.length === 0 && existingCount === 0
              ? 'No hay equipos registrados aún para calcular el preview.'
              : 'Preview no disponible — el torneo se generará desde los equipos en Supabase.'}
          </p>`}
        </div>
      </div>

      <!-- Resultado -->
      <div id="sc-result" class="mt-6"></div>
    `;

    window._scheduleGenerate = async () => {
      const btn    = document.getElementById('sc-btn');
      const result = document.getElementById('sc-result');
      btn.disabled = true;
      btn.textContent = '⏳ Procesando...';
      result.innerHTML = `
        <div class="card" style="border-top:4px solid #3b82f6;">
          <div id="sc-log" style="font-family:monospace;font-size:13px;color:#93c5fd;line-height:2;"></div>
        </div>`;

      const log = (msg) => {
        const el = document.getElementById('sc-log');
        if (el) el.innerHTML += msg + '<br>';
      };

      try {
        // Paso 1: Borrar todos los partidos existentes
        log('🗑️ Borrando partidos existentes...');
        try {
          await Api.clearAllMatches();
          log('✅ Tabla matches limpiada.');
        } catch(e) {
          log('⚠️ No se pudo limpiar (puede que ya esté vacía): ' + e.message);
        }

        // Paso 2: Generar torneo completo
        log('⚙️ Generando fixture completo...');
        const res = await Api.generateAllSchedule({ clear_existing: false });

        log(`✅ <strong style="color:#6ee7b7;">${res.total_matches} partidos generados en ${res.groups.length} grupos</strong>`);

        result.innerHTML = `
          <div class="card" style="border-top:4px solid #10b981;">
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
              <div style="font-size:48px;">✅</div>
              <div>
                <div style="font-size:28px;font-weight:900;color:#6ee7b7;">${res.total_matches} partidos generados</div>
                <div style="color:#94a3b8;margin-top:4px;">${res.groups.length} grupos — todos contra todos</div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin-bottom:20px;">
              ${res.groups.map(g => `
                <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:12px;
                             border-left:3px solid ${Utils.sportColor(g.sport)};">
                  <div style="font-size:13px;font-weight:700;color:white;">
                    ${Utils.sportIcon(g.sport)} ${g.sport}
                  </div>
                  <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${g.category} &bull; ${g.gender}</div>
                  <div style="margin-top:6px;display:flex;justify-content:space-between;">
                    <span style="font-size:12px;color:#64748b;">👥 ${g.teams} equipos</span>
                    <span style="font-size:13px;font-weight:700;color:${Utils.sportColor(g.sport)};">
                      ${g.matches} partidos
                    </span>
                  </div>
                </div>`).join('')}
            </div>
            <button class="btn-primary" onclick="App.navigate('calendar')">
              📅 Ver Calendario →
            </button>
          </div>`;
        Utils.toast(res.total_matches + ' partidos generados exitosamente', 'success');
      } catch(e) {
        result.innerHTML = `<div class="card" style="border:1px solid rgba(220,38,38,0.3);color:#fca5a5;">
          ❌ ${e.message}
        </div>`;
        Utils.toast(e.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '🗓️ Generar Torneo Completo';
      }
    };

  } catch(e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error cargando la página: ${e.message}</div>`;
  }
};

function _scRenderGroups(groups) {
  if (!groups || groups.length === 0) return '<p class="text-gray-400">Sin datos</p>';

  const bySport = {};
  for (const g of groups) {
    (bySport[g.sport] = bySport[g.sport] || []).push(g);
  }

  return Object.entries(bySport).map(([sport, items]) => {
    const color = Utils.sportColor(sport);
    const icon  = Utils.sportIcon(sport);
    const totalMatches = items.reduce((s, i) => s + i.expected_matches, 0);
    return `
      <div style="margin-bottom:16px;">
        <div style="font-size:13px;font-weight:700;color:${color};margin-bottom:6px;
                    display:flex;justify-content:space-between;">
          <span>${icon} ${sport}</span>
          <span style="color:#64748b;">${totalMatches} partidos</span>
        </div>
        ${items.map(g => `
          <div style="display:flex;justify-content:space-between;align-items:center;
                      padding:7px 10px;border-radius:6px;margin-bottom:4px;
                      background:rgba(255,255,255,0.03);">
            <div>
              <span style="font-size:12px;color:#e2e8f0;">${g.category}</span>
              <span style="font-size:11px;color:#64748b;margin-left:6px;">
                ${g.gender === 'Masculino' ? '🔵' : g.gender === 'Femenino' ? '🔴' : '🟣'} ${g.gender}
              </span>
            </div>
            <div style="text-align:right;">
              <span style="font-size:12px;color:#94a3b8;">👥 ${g.teams}</span>
              <span style="font-size:12px;font-weight:700;color:${color};margin-left:8px;">
                ${g.expected_matches} partidos
              </span>
            </div>
          </div>`).join('')}
      </div>`;
  }).join('');
}

window.Pages = window.Pages || {};
window.Pages.Schedule = Pages.Schedule;
