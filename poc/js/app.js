// Шелл приложения: навигация, переключение роли, маршрутизатор.
// Шаблоны страниц подгружаются через fetch, скрипты — через динамический import().

import { session, setRole } from './db.js';
import { toast, escapeHtml } from './ui.js';

const HOME = {
  student: '/catalog',
  reviewer: '/review',
  author: '/author',
};

const NAV = {
  student: [
    { path: '/catalog', label: 'Каталог курсов' },
    { path: '/my-courses', label: 'Мои курсы' },
  ],
  reviewer: [
    { path: '/review', label: 'Очередь проверки' },
  ],
  author: [
    { path: '/author', label: 'Мои курсы' },
    { path: '/schedule', label: 'Расписание' },
  ],
};

const ROLE_LABELS = { student: 'Ученик', reviewer: 'Проверяющий', author: 'Автор курса' };

const routes = [
  { pattern: /^\/catalog$/, template: 'templates/catalog.html', load: () => import('./pages/catalog.js') },
  { pattern: /^\/my-courses$/, template: 'templates/my-courses.html', load: () => import('./pages/my-courses.js') },
  { pattern: /^\/course\/([\w-]+)$/, template: 'templates/course.html', load: () => import('./pages/course.js') },
  { pattern: /^\/lesson\/([\w-]+)$/, template: 'templates/lesson.html', load: () => import('./pages/lesson.js') },
  { pattern: /^\/review$/, template: 'templates/review.html', load: () => import('./pages/review.js') },
  { pattern: /^\/author$/, template: 'templates/author.html', load: () => import('./pages/author.js') },
  { pattern: /^\/schedule$/, template: 'templates/schedule.html', load: () => import('./pages/schedule.js') },
  { pattern: /^\/lesson-editor\/([\w-]+)$/, template: 'templates/lesson-editor.html', load: () => import('./pages/lesson-editor.js') },
];

const TITLES = {
  '/catalog': 'Каталог курсов',
  '/my-courses': 'Мои курсы',
  '/review': 'Очередь проверки',
  '/author': 'Мои курсы',
  '/schedule': 'Расписание занятий',
};

export function navigate(path) {
  const target = '#' + path;
  if (location.hash === target) route();
  else location.hash = target;
}

function renderNav() {
  document.getElementById('nav').innerHTML = NAV[session.role]
    .map((item) => `<a href="#${item.path}" data-nav="${item.path}">${item.label}</a>`)
    .join('');
}

function highlightNav(path) {
  document.querySelectorAll('#nav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.nav === path);
  });
}

function renderRoleSwitch() {
  const roles = [
    { id: 'student', label: 'Ученик' },
    { id: 'reviewer', label: 'Проверяющий' },
    { id: 'author', label: 'Автор курса' },
  ];
  document.getElementById('role-switch').innerHTML = roles
    .map((r) => `<button data-role="${r.id}" class="${session.role === r.id ? 'active' : ''}">${r.label}</button>`)
    .join('');
}

function guardForRole(role, path) {
  const authorOnly = path === '/schedule' || path.startsWith('/lesson-editor/');
  if (authorOnly && role !== 'author') return false;
  if (role === 'student' && ['/review', '/author'].includes(path)) return false;
  if (role === 'reviewer' && ['/catalog', '/my-courses', '/author'].includes(path)) return false;
  if (role === 'author' && ['/catalog', '/my-courses', '/review'].includes(path)) return false;
  return true;
}

async function route() {
  const raw = location.hash.replace(/^#/, '');
  const path = raw || HOME[session.role];

  let matched = null;
  let params = [];
  for (const r of routes) {
    const m = path.match(r.pattern);
    if (m) { matched = r; params = m.slice(1); break; }
  }

  if (!matched || guardForRole(session.role, path) === false) {
    navigate(HOME[session.role]);
    return;
  }

  const page = document.getElementById('page');
  page.innerHTML = '<p class="loading">Загрузка…</p>';

  let html;
  try {
    const res = await fetch(matched.template);
    html = await res.text();
  } catch (err) {
    page.innerHTML = '<p class="muted">Не удалось загрузить шаблон.</p>';
    return;
  }

  page.innerHTML = html;

  const mod = await matched.load();
  try {
    if (typeof mod.init === 'function') {
      await mod.init(page, params, navigate);
    }
  } catch (err) {
    page.innerHTML = `<p class="muted">${err && err.message ? escapeHtml(err.message) : 'Произошла ошибка'}</p>`;
  }

  highlightNav(path);
  document.title = `${TITLES[path] || 'PracticeLab'} — PracticeLab PoC`;
}

function init() {
  renderNav();
  renderRoleSwitch();

  document.getElementById('role-switch').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-role]');
    if (!btn) return;
    const role = btn.dataset.role;
    if (role === session.role) return;
    setRole(role);
    renderNav();
    renderRoleSwitch();
    toast(`Роль: «${ROLE_LABELS[role]}»`, 'info');
    navigate(HOME[role]);
  });

  window.addEventListener('hashchange', route);
  route();
}

init();
