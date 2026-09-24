// Каталог курсов (роль «Ученик»): value case «записаться на курс».

import { listActiveCourses, enroll } from '../api.js';
import { session } from '../db.js';
import { escapeHtml, runAction } from '../ui.js';

export async function init(root) {
  const listEl = root.querySelector('#catalog-list');
  await render();

  async function render() {
    const courses = await listActiveCourses(session.userId);
    listEl.innerHTML = courses.length
      ? courses.map(renderCard).join('')
      : '<p class="muted">Нет активных курсов.</p>';
  }

  function renderCard(c) {
    return `
      <article class="card">
        <div class="card-body">
          <h2>${escapeHtml(c.title)}</h2>
          <p class="muted">${escapeHtml(c.description)}</p>
        </div>
        <div class="card-actions">
          ${c.enrolled
            ? '<span class="muted">Вы записаны</span>'
            : `<button class="btn btn-primary" data-enroll="${c.id}">Записаться</button>`}
        </div>
      </article>`;
  }

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-enroll]');
    if (!btn) return;
    const ok = await runAction(btn, () => enroll(session.userId, btn.dataset.enroll), {
      success: 'Вы записаны на курс',
    });
    if (ok) await render();
  });
}
