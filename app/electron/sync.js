const repo = require('./examenes-repo');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const CHECK_INTERVAL_MS = 15000;

let isOnline = false;
let syncing = false;
let onStatusChange = null;

async function checkConnection() {
  try {
    const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(4000) });
    isOnline = res.ok;
  } catch {
    isOnline = false;
  }
  return isOnline;
}

async function syncPending() {
  if (syncing || !isOnline) return;
  syncing = true;

  try {
    for (const { id } of repo.pendientes()) {
      const examen = repo.obtener(id);
      try {
        const res = await fetch(`${API_URL}/examenes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(examen),
          signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
          repo.marcarSincronizado(id);
        } else {
          repo.marcarError(id);
        }
      } catch {
        break;
      }
    }
  } finally {
    syncing = false;
    if (onStatusChange) onStatusChange(getStatus());
  }
}

function getStatus() {
  return { isOnline, pendientes: repo.pendientes().length };
}

function start(callback) {
  onStatusChange = callback;

  const tick = async () => {
    const wasOnline = isOnline;
    await checkConnection();
    if (isOnline && !wasOnline) await syncPending();
    if (onStatusChange) onStatusChange(getStatus());
  };

  tick();
  setInterval(tick, CHECK_INTERVAL_MS);
}

module.exports = { start, syncPending, getStatus };
