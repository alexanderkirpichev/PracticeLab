// Мои курсы (роль «Ученик»): список курсов с прогрессом.

import { listMyCourses } from '../api.js';
import { session } from '../db.js';
import { escapeHtml, statusBadge } from '../ui.js';

export async function init(root) {
  const listEl = root.querySelector('#my-courses-list');
  const courses = await listMyCourses(session.userId);

  listEl.innerHTML = courses.length
    ? courses.map((c) => `
      <a class="card card-link" href="#/course/${c.id}">
        <div class="card-body">
          <h2>${escapeHtml(c.title)}</h2>
          <p class="muted">${escapeHtml(c.description)}</p>
          <div class="meta">
            ${c.lessonsCount} урок(ов) · ${statusBadge(c.progressStatus)}
          </div>
        </div>
      </a>`).join('')
    : '<p class="muted">Вы пока не записаны ни на один курс. Загляните в каталог.</p>';
}
