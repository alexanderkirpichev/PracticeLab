// Расписание занятий (роль «Автор курса»): value case «провести занятие».

import { listSessions, conductSession } from '../api.js';
import { session } from '../db.js';
import { escapeHtml, runAction, fmtDate } from '../ui.js';

export async function init(root) {
  const listEl = root.querySelector('#schedule-list');
  await render();

  async function render() {
    const sessions = await listSessions(session.userId);
    listEl.innerHTML = sessions.length
      ? sessions.map(sessionCard).join('')
      : '<p class="muted">Занятий в расписании нет.</p>';
  }

  function sessionCard(s) {
    const conducted = s.status === 'conducted';
    const upcoming = new Date(s.scheduledAt) > new Date();
    return `
      <article class="card">
        <div class="card-body">
          <h2>${escapeHtml(s.title)}</h2>
          <p class="muted">Курс: ${escapeHtml(s.courseTitle)}</p>
          <p class="muted">Начало: ${fmtDate(s.scheduledAt)}</p>
        </div>
        <div class="card-actions">
          ${conducted
            ? '<span class="badge badge-conducted">Проведено ✓</span>'
            : `<button class="btn ${upcoming ? 'btn-primary' : 'btn-secondary'}" data-conduct="${s.id}">Провести занятие</button>`}
        </div>
      </article>`;
  }

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-conduct]');
    if (!btn) return;
    const ok = await runAction(btn, () => conductSession(btn.dataset.conduct), {
      success: 'Занятие проведено',
    });
    if (ok) await render();
  });
}
