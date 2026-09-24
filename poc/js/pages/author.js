// Мои курсы (роль «Автор курса»): value case «создать курс».

import { listAllCourses, createCourse } from '../api.js';
import { session } from '../db.js';
import { escapeHtml, statusBadge, runAction } from '../ui.js';

export async function init(root) {
  const listEl = root.querySelector('#author-list');
  const createBtn = root.querySelector('#create-course-btn');
  const formEl = root.querySelector('#create-form');

  await renderList();

  createBtn.addEventListener('click', () => {
    const willShow = formEl.hidden;
    formEl.hidden = !willShow;
    if (willShow) formEl.innerHTML = createFormHtml();
  });

  formEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('#save-course-btn');
    if (!btn) return;
    const title = root.querySelector('#new-title').value;
    const description = root.querySelector('#new-description').value;
    const ok = await runAction(btn, () => createCourse(session.userId, title, description), {
      success: 'Курс создан',
    });
    if (ok) {
      formEl.hidden = true;
      await renderList();
    }
  });

  async function renderList() {
    const courses = await listAllCourses();
    listEl.innerHTML = courses.length
      ? courses.map((c) => `
        <a class="card card-link" href="#/course/${c.id}">
          <div class="card-body">
            <h2>${escapeHtml(c.title)}</h2>
            <p class="muted">${escapeHtml(c.description) || 'Без описания'}</p>
            <div class="meta">
              ${statusBadge(c.status)}
              <span class="muted">${c.lessonsCount} урок(ов)</span>
              ${c.reviewerName
                ? `<span class="muted">· ${escapeHtml(c.reviewerName)}</span>`
                : '<span class="muted">· проверяющий не назначен</span>'}
            </div>
          </div>
        </a>`).join('')
      : '<p class="muted">У вас пока нет курсов.</p>';
  }

  function createFormHtml() {
    return `
      <div class="panel">
        <h2>Новый курс</h2>
        <div class="field">
          <label>Название курса</label>
          <input id="new-title" type="text" placeholder="Например, «Основы SQL»" />
        </div>
        <div class="field">
          <label>Описание</label>
          <textarea id="new-description" rows="2" placeholder="Краткое описание курса"></textarea>
        </div>
        <button class="btn btn-primary" id="save-course-btn">Создать курс</button>
      </div>`;
  }
}
