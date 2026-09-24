// Страница курса. Для ученика — уроки; для автора — управление
// (назначить проверяющего, опубликовать).

import { getCourse, assignReviewer, publishCourse } from '../api.js';
import { store, session } from '../db.js';
import { escapeHtml, statusBadge, runAction } from '../ui.js';

export async function init(root, params) {
  const courseId = params[0];
  let course = await getCourse(courseId);
  const isAuthor = session.role === 'author' && course.authorId === session.userId;

  render();

  function render() {
    root.querySelector('#course-root').innerHTML = `
      <div class="page-head">
        <h1>${escapeHtml(course.title)}</h1>
        <p class="muted">${escapeHtml(course.description)}</p>
        <div class="meta">
          ${statusBadge(course.status)}
          ${course.reviewerName ? `<span class="muted">Проверяющий: ${escapeHtml(course.reviewerName)}</span>` : ''}
        </div>
      </div>

      ${isAuthor ? authorBlock() : ''}

      <h2>Уроки</h2>
      <div class="list">
        ${course.lessons.length
          ? course.lessons.map((l) => `
            <div class="list-item">
              <div>
                <strong>${l.order}. ${escapeHtml(l.title)}</strong>
                <div class="muted">${escapeHtml(l.description)}</div>
              </div>
              <div class="row">
                ${l.hasReview ? '<span class="badge badge-under_review">С ревью</span>' : ''}
                ${isAuthor ? '' : `<a class="btn btn-secondary btn-sm" href="#/lesson/${l.id}">Открыть</a>`}
              </div>
            </div>`).join('')
          : '<p class="muted">Уроков пока нет.</p>'}
      </div>
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
        <button class="btn ${locked ? 'btn-secondary' : 'btn-primary'}" id="publish-btn" ${locked ? 'disabled' : ''}>
          ${locked ? 'Курс опубликован' : 'Опубликовать курс'}
        </button>
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
  }

  async function refresh() {
    course = await getCourse(courseId);
    render();
  }
}
