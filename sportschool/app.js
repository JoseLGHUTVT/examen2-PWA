'use strict';
const $ = s => document.querySelector(s);
const ENDPOINT = 'https://jsonplaceholder.typicode.com';

/* ---------- Sprite pixel (trofeo) ---------- */
const TROFEO = ['..YYYYYYYY..','.YYYYYYYYYY.','YY.YYYYYY.YY','YY.YYYYYY.YY','.YYYYYYYYYY.','..YYYYYYYY..',
  '....YYYY....','.....YY.....','.....YY.....','....YYYY....','...YYYYYY...','...YYYYYY...'];
document.querySelectorAll('canvas.sprite').forEach(c => {
  const g = c.getContext('2d');
  TROFEO.forEach((r, y) => [...r].forEach((p, x) => {
    if (p === 'Y') { g.fillStyle = y > 5 ? '#c38b2e' : '#ffcd75'; g.fillRect(x, y, 1, 1); }
  }));
});

/* ---------- IndexedDB ---------- */
const openDB = () => new Promise((ok, fail) => {
  const r = indexedDB.open('sportschool', 1);
  r.onupgradeneeded = () => {
    r.result.createObjectStore('students', { keyPath: 'id', autoIncrement: true });
    r.result.createObjectStore('activities', { keyPath: 'id', autoIncrement: true });
  };
  r.onsuccess = () => ok(r.result);
  r.onerror = () => fail(r.error);
});
const run = async (store, mode, fn) => {
  const db = await openDB();
  return new Promise((ok, fail) => {
    const t = db.transaction(store, mode), q = fn(t.objectStore(store));
    t.oncomplete = () => ok(q.result); t.onerror = () => fail(t.error);
  });
};
const addRec = (s, o) => run(s, 'readwrite', st => st.add(o));
const delRec = (s, id) => run(s, 'readwrite', st => st.delete(id));
const getAll = s => run(s, 'readonly', st => st.getAll());

let students = [], acts = [];

/* ---------- Utilidades de DOM (textContent evita inyección) ---------- */
const tr = cells => { const r = document.createElement('tr');
  cells.forEach(c => { const d = document.createElement('td'); d.textContent = c; r.appendChild(d); }); return r; };
const kpi = (n, l) => { const d = document.createElement('div'); d.className = 'kpi';
  const b = document.createElement('b'); b.textContent = n; d.append(b, l); return d; };
const nombre = id => (students.find(s => s.id === id) || {}).nombre || '—';
const fmt = n => Number(n.toFixed(2)).toString();

function fillSelect(sel, withAll) {
  const prev = sel.value; sel.replaceChildren();
  if (withAll) sel.add(new Option('Todos', 'all'));
  if (!withAll && !students.length) sel.add(new Option('Registra un alumno primero', ''));
  students.forEach(s => sel.add(new Option(`${s.nombre} (${s.grupo})`, s.id)));
  if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
}
const totals = list => ({ n: list.length, min: list.reduce((a, x) => a + x.min, 0), km: list.reduce((a, x) => a + x.km, 0) });
const pick = (sel) => sel.value === 'all' ? acts : acts.filter(a => a.alumnoId === Number(sel.value));

/* ---------- Render (CSR) ---------- */
function render() {
  fillSelect($('#selAlumno'), false); fillSelect($('#filtro'), true); fillSelect($('#filtroS'), true);

  const lista = $('#listaAlumnos'); lista.replaceChildren();
  if (!students.length) lista.textContent = 'Aún no hay alumnos. Registra el primero en el formulario.';
  students.forEach(s => { const d = document.createElement('div'); d.className = 'alumno';
    const a = document.createElement('span'); a.textContent = s.nombre;
    const b = document.createElement('span'); b.textContent = `${s.grupo} · ${s.disciplina}`;
    d.append(a, b); lista.appendChild(d); });

  const h = pick($('#filtro')).slice().sort((x, y) => y.fecha.localeCompare(x.fecha));
  $('#tbody').replaceChildren(...h.map(a => {
    const r = tr([a.fecha, nombre(a.alumnoId), a.actividad, a.min, fmt(a.km),
      a.lat != null ? `${a.lat.toFixed(3)}, ${a.lon.toFixed(3)}` : '—', a.obs || '']);
    const td = document.createElement('td'), b = document.createElement('button');
    b.className = 'btn del'; b.textContent = 'Borrar'; b.dataset.del = a.id; td.appendChild(b); r.appendChild(td); return r; }));
  $('#vacio').textContent = h.length ? '' : 'Sin actividades para este alumno. Anota una en la pestaña Actividad.';

  const t = totals(pick($('#filtroS')));
  $('#kpis').replaceChildren(kpi(t.n, 'actividades'), kpi(t.min, 'minutos'), kpi(fmt(t.km), 'km'));
  const g = totals(acts);
  $('#homeKpis').replaceChildren(kpi(students.length, 'alumnos'), kpi(g.n, 'actividades'), kpi(g.min, 'minutos'));

  const per = students.map(s => ({ n: s.nombre, m: totals(acts.filter(a => a.alumnoId === s.id)).min }));
  const max = Math.max(1, ...per.map(p => p.m)), bars = $('#bars'); bars.replaceChildren();
  per.forEach(p => { const r = document.createElement('div'); r.className = 'bar';
    const n = document.createElement('span'); n.textContent = p.n;
    const w = document.createElement('div'), i = document.createElement('i'); i.style.width = (p.m / max * 100) + '%'; w.appendChild(i);
    const m = document.createElement('span'); m.textContent = p.m; r.append(n, w, m); bars.appendChild(r); });
}
async function load() { [students, acts] = await Promise.all([getAll('students'), getAll('activities')]); render(); }

/* ---------- Navegación ---------- */
function go(v) {
  document.querySelectorAll('.view').forEach(e => e.classList.toggle('on', e.id === v));
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
}
document.addEventListener('click', e => {
  if (e.target.dataset.v) go(e.target.dataset.v);
  if (e.target.dataset.go) go(e.target.dataset.go);
});
$('#tbody').addEventListener('click', async e => {
  const id = e.target.dataset.del; if (!id) return;
  if (!confirm('¿Borrar esta actividad? No se puede deshacer.')) return;
  await delRec('activities', Number(id)); await load();
});
['#filtro', '#filtroS'].forEach(s => $(s).addEventListener('change', render));

/* ---------- Fetch (consulta y envío) ---------- */
const log = t => { $('#log').textContent = t; };
async function pullRemote() {
  log('Consultando…');
  try {
    const r = await fetch(`${ENDPOINT}/users?_limit=3`);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    log(`GET OK (${r.status}). Usuarios de prueba:\n` + d.map(u => `- ${u.name}`).join('\n') +
      '\n\nNota: es un servicio de prueba; no hay sincronización real con la base local.');
  } catch (e) { log('Sin conexión o servicio no disponible: ' + e.message + '\nLos datos locales siguen disponibles.'); }
}
async function pushRemote(rec) {
  try {
    const r = await fetch(`${ENDPOINT}/posts`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: rec.actividad, body: `${rec.min} min, ${rec.km} km`, userId: rec.alumnoId }) });
    const d = await r.json(); log(`POST demostrativo OK (${r.status}), id simulado: ${d.id}. No es sincronización real.`);
  } catch { log('POST demostrativo no enviado (sin conexión). El registro quedó guardado localmente.'); }
}
$('#btnPull').addEventListener('click', pullRemote);

/* ---------- Formularios ---------- */
$('#fAlumno').addEventListener('submit', async e => {
  e.preventDefault(); const f = new FormData(e.target);
  await addRec('students', { nombre: f.get('nombre').trim(), grupo: f.get('grupo').trim(), disciplina: f.get('disciplina') });
  e.target.reset(); await load();
});
const hoy = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
$('#fAct [name=fecha]').value = hoy();

const getPos = () => new Promise((ok, no) => navigator.geolocation
  ? navigator.geolocation.getCurrentPosition(p => ok(p.coords), no, { timeout: 8000 }) : no(new Error('no soportada')));

$('#chkNotif').addEventListener('change', async e => {
  if (!e.target.checked) return;
  const msg = $('#msgAct');
  if (!('Notification' in window)) { msg.textContent = 'Este navegador no admite notificaciones.'; e.target.checked = false; return; }
  const p = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (p === 'granted') msg.textContent = 'Notificaciones activadas.';
  else { msg.textContent = 'Notificaciones bloqueadas. Actívalas en el candado junto a la URL > Notificaciones > Permitir, y recarga.'; e.target.checked = false; }
});
async function notify(txt) {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'default') await Notification.requestPermission();
  if (Notification.permission !== 'granted') return false;
  const opts = { body: txt, icon: 'icons/icon-192.png', tag: 'ss-' + Date.now() }; // etiqueta única: Chrome no reemplaza avisos previos
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification('SportSchool', opts); else new Notification('SportSchool', opts);
    return true;
  } catch (e) {
    try { new Notification('SportSchool', opts); return true; } catch { return false; }
  }
}
$('#btnTestNotif').addEventListener('click', async () => {
  const ok = await notify('Notificación de prueba: todo funciona.');
  $('#msgTest').textContent = ok ? 'Notificación enviada. Si no la ves, revisa Windows: No molestar y notificaciones de Chrome.'
    : 'No se pudo mostrar. Permite las notificaciones en el candado junto a la URL.';
});
$('#fAct').addEventListener('submit', async e => {
  e.preventDefault(); const f = new FormData(e.target), msg = $('#msgAct');
  const rec = { alumnoId: Number(f.get('alumno')), fecha: f.get('fecha'), actividad: f.get('actividad').trim(),
    min: Number(f.get('min')), km: Number(f.get('km')), obs: f.get('obs').trim(), lat: null, lon: null };
  if (!rec.alumnoId) { msg.textContent = 'Primero registra un alumno.'; return; }
  msg.textContent = '';
  const quiereAviso = $('#chkNotif').checked;
  if ($('#chkGeo').checked) {
    try { const c = await getPos(); rec.lat = c.latitude; rec.lon = c.longitude; }
    catch { msg.textContent = 'No se obtuvo la ubicación; se guardó sin ella. '; }
  }
  await addRec('activities', rec);
  msg.textContent += 'Actividad guardada.';
  e.target.reset(); $('#fAct [name=fecha]').value = hoy();
  await load(); pushRemote(rec);
  if (quiereAviso) notify(`${nombre(rec.alumnoId)}: ${rec.actividad} (${rec.min} min)`).then(ok => {
    msg.textContent += ok ? ' Notificación enviada.' : ' No se pudo mostrar la notificación (revisa los permisos).'; });
});

/* ---------- Estado de red, splash y Service Worker ---------- */
const net = () => { const o = navigator.onLine; $('#net').textContent = o ? 'en línea' : 'sin conexión'; $('#net').classList.toggle('off', !o); };
addEventListener('online', net); addEventListener('offline', net); net();
setTimeout(() => { $('#splash').classList.add('out'); }, 1800);
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(console.error));
load();
