// Страница курса. Для ученика — уроки; для автора — управление
// (назначить проверяющего, опубликовать).

import { getCourse, assignReviewer, publishCourse, setCourseDeadline, createLesson, publishLesson } from '../api.js';
import { store, session } from '../db.js';
import { escapeHtml, statusBadge, runAction, fmtDate } from '../ui.js';

export async function init(root, params) {
  const courseId = params[0];
  let course = await getCourse(courseId);
  const isAuthor = session.role === 'author' && course.authorId === session.userId;

  render();

  function render() {
    const lessons = isAuthor ? course.lessons : course.lessons.filter((l) => !l.draft);
    root.querySelector('#course-root').innerHTML = `
      <div class="page-head">
        <h1>${escapeHtml(course.title)}</h1>
        <p class="muted">${escapeHtml(course.description)}</p>
        <div class="meta">
          ${statusBadge(course.status)}
          ${isAuthor && course.developed ? '<span class="badge badge-developed">Разработан ✓</span>' : ''}
          ${course.reviewerName ? `<span class="muted">Проверяющий: ${escapeHtml(course.reviewerName)}</span>` : ''}
        </div>
        ${course.deadline ? `<p class="muted">Дата окончания курса: ${fmtDate(course.deadline)}${course.expired ? ' <span class="result warn">— срок истёк</span>' : ''}</p>` : ''}
      </div>

      ${isAuthor ? authorBlock() : ''}

      <h2>Уроки</h2>
      <div class="list">
        ${lessons.length
          ? lessons.map((l) => `
            <div class="list-item">
              <div>
                <strong>${l.order}. ${escapeHtml(l.title)}</strong>
                ${l.draft ? ' <span class="badge badge-draft">Черновик</span>' : ''}
                <div class="muted">${escapeHtml(l.description)}${isAuthor ? ` · ${l.stepsCount} шаг(ов)` : ''}</div>
              </div>
              <div class="row">
                ${l.hasReview ? '<span class="badge badge-under_review">С ревью</span>' : ''}
                ${isAuthor
                  ? `<a class="btn btn-secondary btn-sm" href="#/lesson-editor/${l.id}">Редактировать</a>${l.draft ? ` <button class="btn btn-secondary btn-sm" data-publish-lesson="${l.id}">Опубликовать</button>` : ''}`
                  : `<a class="btn btn-secondary btn-sm" href="#/lesson/${l.id}">Открыть</a>`}
              </div>
            </div>`).join('')
          : '<p class="muted">Уроков пока нет.</p>'}
      </div>

      ${isAuthor ? addLessonBlock() : ''}
    `;
    bindAuthor();
  }

  function authorBlock() {
    const reviewers = store.users.filter((u) => u.role === 'reviewer');
    const locked = course.status === 'active';
    const assigned = !!course.reviewerId;
    const assignLocked = locked || assigned;
    return `
      <section class="panel">
        <h2>Управление курсом</h2>
        <div class="field">
          <label>Проверяющий курса</label>
          <div class="row">
            <select id="reviewer-select" ${assignLocked ? 'disabled' : ''}>
              <option value="">— не назначен —</option>
              ${reviewers.map((r) => `<option value="${r.id}" ${r.id === course.reviewerId ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('')}
            </select>
            <button class="btn btn-secondary" id="assign-btn" ${assignLocked ? 'disabled' : ''}>
              ${assigned ? 'Проверяющий назначен' : 'Назначить'}
            </button>
          </div>
        </div>
        <div class="field">
          <label>Дата окончания курса</label>
          <div class="row">
            <input id="deadline-input" type="datetime-local" value="${toLocalInput(course.deadline)}" />
            <button class="btn btn-secondary" id="deadline-btn">Сохранить дату</button>
          </div>
        </div>
        <button class="btn ${locked ? 'btn-secondary' : 'btn-primary'}" id="publish-btn" ${locked ? 'disabled' : ''}>
          ${locked ? 'Курс опубликован' : 'Опубликовать курс'}
        </button>
      </section>`;
  }

  function toLocalInput(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function addLessonBlock() {
    return `
      <section class="panel">
        <h2>Новый урок</h2>
        <div class="field">
          <label>Название урока</label>
          <input id="lesson-title" type="text" placeholder="Например, «Функции»" />
        </div>
        <div class="field">
          <label>Описание</label>
          <textarea id="lesson-description" rows="2" placeholder="Краткое описание урока"></textarea>
        </div>
        <div class="field">
          <label><input id="lesson-has-review" type="checkbox" /> Урок с ревью</label>
        </div>
        <div class="row">
          <button class="btn btn-secondary" id="save-draft-btn">Сохранить как черновик</button>
          <button class="btn btn-primary" id="save-publish-btn">Сохранить и опубликовать</button>
        </div>
      </section>`;
  }

  function bindAuthor() {
    if (!isAuthor) return;
    const assignBtn = root.querySelector('#assign-btn');
    const publishBtn = root.querySelector('#publish-btn');

    if (assignBtn) {
      assignBtn.addEventListener('click', async () => {
        const reviewerId = root.querySelector('#reviewer-select').value;
        const ok = await runAction(assignBtn, () => assignReviewer(courseId, reviewerId), {
          success: 'Проверяющий назначен',
        });
        if (ok) await refresh();
      });
    }
    if (publishBtn) {
      publishBtn.addEventListener('click', async () => {
        const ok = await runAction(publishBtn, () => publishCourse(courseId), {
          success: 'Курс опубликован и доступен в каталоге',
        });
        if (ok) await refresh();
      });
    }

    const deadlineBtn = root.querySelector('#deadline-btn');
    if (deadlineBtn) {
      deadlineBtn.addEventListener('click', async () => {
        const value = root.querySelector('#deadline-input').value;
        const ok = await runAction(deadlineBtn, () => setCourseDeadline(courseId, value), {
          success: value ? 'Дата окончания сохранена' : 'Дата окончания сброшена',
        });
        if (ok) await refresh();
      });
    }

    root.querySelectorAll('[data-publish-lesson]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ok = await runAction(btn, () => publishLesson(session.userId, btn.dataset.publishLesson), {
          success: 'Урок опубликован',
        });
        if (ok) await refresh();
      });
    });

    const saveDraftBtn = root.querySelector('#save-draft-btn');
    const savePublishBtn = root.querySelector('#save-publish-btn');
    if (saveDraftBtn) saveDraftBtn.addEventListener('click', () => saveLesson(true));
    if (savePublishBtn) savePublishBtn.addEventListener('click', () => saveLesson(false));

    function saveLesson(draft) {
      const btn = draft ? saveDraftBtn : savePublishBtn;
      const title = root.querySelector('#lesson-title').value;
      const description = root.querySelector('#lesson-description').value;
      const hasReview = root.querySelector('#lesson-has-review').checked;
      runAction(btn, () => createLesson(session.userId, courseId, { title, description, hasReview, draft }), {
        success: draft ? 'Урок сохранён как черновик' : 'Урок опубликован',
      }).then((ok) => { if (ok) refresh(); });
    }
  }

  async function refresh() {
    course = await getCourse(courseId);
    render();
  }
}
