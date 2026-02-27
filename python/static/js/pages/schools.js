/**
 * Página: Colegios
 */
Pages.Schools = async function(container, opts) {
  container.innerHTML = Utils.spinner();
  try {
    const [schools, teams] = await Promise.all([
      Api.getSchools(),
      Api.getTeams(),
    ]);

    if (opts && opts.schoolId) {
      _showSchoolDetail(container, opts.schoolId, schools, teams);
      return;
    }

    container.innerHTML = `
      <div class="mb-6">
        <h2 class="text-3xl font-black" style="color:#60a5fa;">🏫 Colegios</h2>
        <p class="text-gray-400 mt-1">${schools.length} colegios participantes</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
        ${schools.map(school => {
          const schoolTeams = teams.filter(t => t.school?.id === school.id || t.school?.name === school.name);
          const sports = [...new Set(schoolTeams.map(t => t.sport?.name).filter(Boolean))];
          return `
            <div class="card" style="cursor:pointer;text-align:center;" onclick="_showSchoolDetail(document.getElementById('page-content'),'${school.id}',Pages._schoolsData.schools,Pages._schoolsData.teams)">
              ${school.logo_url
                ? `<img src="${school.logo_url}" style="width:80px;height:80px;border-radius:50%;margin:0 auto 12px;object-fit:contain;background:white;padding:8px;">`
                : `<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#1e40af,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:white;margin:0 auto 12px;">${Utils.schoolInitials(school.name)}</div>`
              }
              <h3 style="font-weight:700;font-size:16px;">${school.name}</h3>
              <p style="color:#94a3b8;font-size:13px;margin-top:4px;">${schoolTeams.length} equipos</p>
              <div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-top:8px;">
                ${sports.map(s => `<span style="background:rgba(255,255,255,0.05);border-radius:8px;padding:2px 8px;font-size:11px;">${Utils.sportIcon(s)} ${s}</span>`).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>
    `;

    Pages._schoolsData = { schools, teams };
    window._showSchoolDetail = _showSchoolDetail;

  } catch(e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error: ${e.message}</div>`;
  }
};

function _showSchoolDetail(container, schoolId, schools, teams) {
  const school = schools.find(s => s.id === schoolId);
  if (!school) { container.innerHTML = '<div class="text-red-400">Colegio no encontrado</div>'; return; }
  const schoolTeams = teams.filter(t => t.school?.id === schoolId || t.school?.name === school.name);

  container.innerHTML = `
    <div class="mb-4"><button class="btn-ghost" onclick="App.navigate('schools')">← Volver</button></div>
    <div class="card mb-6" style="text-align:center;">
      ${school.logo_url
        ? `<img src="${school.logo_url}" style="width:100px;height:100px;border-radius:50%;margin:0 auto 16px;object-fit:contain;background:white;padding:12px;">`
        : `<div style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,#1e40af,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;color:white;margin:0 auto 16px;">${Utils.schoolInitials(school.name)}</div>`
      }
      <h2 style="font-size:28px;font-weight:900;color:white;">${school.name}</h2>
      <p style="color:#94a3b8;margin-top:4px;">${schoolTeams.length} equipos en el torneo</p>
    </div>
    <h3 class="text-xl font-bold mb-4">Equipos</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;">
      ${schoolTeams.length === 0 ? Utils.emptyState('Sin equipos') :
        schoolTeams.map(t => `
          <div class="card" style="cursor:pointer;border-left:4px solid ${Utils.sportColor(t.sport?.name||'')};"
               onclick="App.navigate('teams',{teamId:'${t.id}'})">
            <div style="font-size:13px;color:#94a3b8;">${Utils.sportIcon(t.sport?.name||'')} ${t.sport?.name||''}</div>
            <div style="font-weight:700;margin-top:4px;">${t.name}</div>
            <div style="font-size:12px;color:#64748b;">${t.category?.name||''} &bull; ${t.gender||''}</div>
          </div>`).join('')}
    </div>
  `;
}

window.Pages = Pages;
