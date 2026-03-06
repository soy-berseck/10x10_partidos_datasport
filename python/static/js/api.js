/**
 * API Client - Comunicación con el backend FastAPI
 */
const API_BASE = '';  // Misma origen

const Api = {
  async _request(method, path, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE + path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error desconocido' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    if (res.status === 204) return null;
    return res.json();
  },

  get: (path) => Api._request('GET', path),
  post: (path, body) => Api._request('POST', path, body),
  put: (path, body) => Api._request('PUT', path, body),
  delete: (path) => Api._request('DELETE', path),

  // ─── Schools ────────────────────────────────────────────────────────────────
  getSchools: () => Api.get('/api/schools/'),
  createSchool: (data) => Api.post('/api/schools/', data),
  deleteSchool: (id) => Api.delete(`/api/schools/${id}`),

  // ─── Sports ─────────────────────────────────────────────────────────────────
  getSports: () => Api.get('/api/sports/'),

  // ─── Categories ─────────────────────────────────────────────────────────────
  getCategories: (sport_id = null) => Api.get('/api/categories/' + (sport_id ? `?sport_id=${sport_id}` : '')),

  // ─── Teams ──────────────────────────────────────────────────────────────────
  getTeams: () => Api.get('/api/teams/'),
  getTeam: (id) => Api.get(`/api/teams/${id}`),
  createTeam: (data) => Api.post('/api/teams/', data),
  deleteTeam: (id) => Api.delete(`/api/teams/${id}`),
  setTeamGroup: (id, groupName) => Api._request('PATCH', `/api/teams/${id}/group`, { group_name: groupName }),

  // ─── Players ────────────────────────────────────────────────────────────────
  getPlayers: (team_id = null) => Api.get('/api/players/' + (team_id ? `?team_id=${team_id}` : '')),
  getPlayer: (id) => Api.get(`/api/players/${id}`),
  createPlayer: (data) => Api.post('/api/players/', data),
  updatePlayer: (id, data) => Api.put(`/api/players/${id}`, data),
  deletePlayer: (id) => Api.delete(`/api/players/${id}`),

  // ─── Matches ────────────────────────────────────────────────────────────────
  getMatches: (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v)));
    return Api.get('/api/matches/?' + qs.toString());
  },
  getLiveMatches: () => Api.get('/api/matches/live'),
  getMatch: (id) => Api.get(`/api/matches/${id}`),
  createMatch: (data) => Api.post('/api/matches/', data),
  updateMatch: (id, data) => Api.put(`/api/matches/${id}`, data),
  deleteMatch: (id) => Api.delete(`/api/matches/${id}`),

  // ─── Events ─────────────────────────────────────────────────────────────────
  getEvents: (match_id = null) => Api.get('/api/events/' + (match_id ? `?match_id=${match_id}` : '')),
  createEvent: (data) => Api.post('/api/events/', data),
  deleteEvent: (id) => Api.delete(`/api/events/${id}`),

  // ─── Statistics ─────────────────────────────────────────────────────────────
  getPlayerStats: (sport = null) => Api.get('/api/statistics/players' + (sport ? `?sport=${encodeURIComponent(sport)}` : '')),
  getTeamStats: (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v)));
    return Api.get('/api/statistics/teams?' + qs.toString());
  },

  // ─── Standings ──────────────────────────────────────────────────────────────
  getStandings: (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v)));
    return Api.get('/api/standings/?' + qs.toString());
  },
  getTeamStandings: () => Api.get('/api/standings/team_standings'),

  // ─── Schedule ───────────────────────────────────────────────────────────────
  generateSchedule: (rule) => Api.post('/api/schedule/generate', rule),
  generateAllSchedule: (data) => Api.post('/api/schedule/generate-all', data),
  clearAllMatches: () => Api.delete('/api/schedule/clear-all'),
  getScheduleConfig: () => Api.get('/api/schedule/config'),
  getSchedulePreview: () => Api.get('/api/schedule/preview'),

  // ─── Posts ──────────────────────────────────────────────────────────────────
  getPosts: () => Api.get('/api/posts/'),
  createPost: (data) => Api.post('/api/posts/', data),
  deletePost: (id) => Api.delete(`/api/posts/${id}`),
  toggleReaction: (postId, data) => Api.post(`/api/posts/${postId}/reactions`, data),
  addComment: (postId, data) => Api.post(`/api/posts/${postId}/comments`, data),
  deleteComment: (postId, commentId) => Api.delete(`/api/posts/${postId}/comments/${commentId}`),
  async uploadPostMedia(file) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/posts/upload', { method: 'POST', body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error al subir archivo' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  },

  // ─── Individual Medals ──────────────────────────────────────────────────────
  getIndividualMedals: () => Api.get('/api/individual-medals/'),
  addIndividualMedal: (data) => Api.post('/api/individual-medals/', data),
  deleteIndividualMedal: (id) => Api.delete(`/api/individual-medals/${id}`),
  getIndividualMedalsSummary: () => Api.get('/api/individual-medals/summary'),

  // ─── Venues ───────────────────────────────────────────────────────────────
  getVenues: () => Api.get('/api/venues/'),
  createVenue: (data) => Api.post('/api/venues/', data),
  deleteVenue: (id) => Api.delete(`/api/venues/${id}`),

  // ─── Upload Excel ────────────────────────────────────────────────────────────
  async importPlayersExcel(file) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/players/import-excel', { method: 'POST', body: form });
    if (!res.ok) throw new Error('Error al importar Excel');
    return res.json();
  },
};
