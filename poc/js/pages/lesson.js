// Страница урока (роль «Ученик»): шаги («пройти урок»),
// отправка работы («отправить работу на проверку») и результат («увидеть результат проверки»).

import { getLesson, completeStep, submitWork } from '../api.js';
import { session } from '../db.js';
import { escapeHtml, runAction, toast, fmtDate } from '../ui.js';

export async function init(root, params) {
  const lessonId = params[0];
  let lesson = await getLesson(lessonId, session.userId);

  render();

  function render() {
    const work = lesson.work;
    root.querySelector('#lesson-root').innerHTML = `
      <div class="page-head">
        <p class="muted"><a href="#/course/${lesson.courseId}">← ${escapeHtml(lesson.courseTitle)}</a></p>
        <h1>${escapeHtml(lesson.title)}</h1>
        <p class="muted">${escapeHtml(lesson.description)}</p>
        <div class="meta">${lesson.hasReview ? '<span class="badge badge-under_review">С ревью</span>' : ''}</div>
      </div>

      <section class="panel">
        <h2>Шаги урока <span class="muted">(${lesson.completedCount}/${lesson.totalCount})</span></h2>
        ${lesson.passed ? '<p class="result ok">Урок пройден ✓</p>' : ''}
        <ul class="steps">
          ${lesson.steps.map((s) => `
            <li class="step ${s.done ? 'done' : ''}">
              <span class="step-title">${escapeHtml(s.title)}</span>
              ${s.done
                ? '<span class="step-done">Выполнено ✓</span>'
                : `<button class="btn btn-secondary btn-sm" data-complete="${s.id}">Выполнить</button>`}
            </li>`).join('')}
        </ul>
      </section>

      ${lesson.hasReview ? workBlock(work) : ''}
    `;
    bind();
  }

  function workBlock(work) {
    if (!work) {
      return `
        <section class="panel">
          <h2>Работа по уроку</h2>
          <div class="field">
            <label>Текст работы</label>
            <textarea id="work-content" rows="4" placeholder="Опишите решение…"></textarea>
          </div>
          <button class="btn btn-primary" id="submit-btn">Отправить на проверку</button>
        </section>`;
    }
    if (work.status === 'under_review') {
      return `
        <section class="panel">
          <h2>Работа по уроку</h2>
          <p class="result warn">Работа на проверке. Ожидайте результат.</p>
          <p class="muted">Отправок: ${work.submissionCount}</p>
        </section>`;
    }
    if (work.status === 'submitted') {
      return `
        <section class="panel">
          <h2>Результат проверки</h2>
          <p class="result ok">Работа сдана ✓</p>
          ${work.review && work.review.comments ? `<blockquote>${escapeHtml(work.review.comments)}</blockquote>` : ''}
          ${work.review && work.review.reviewedAt ? `<p class="muted">Проверено: ${fmtDate(work.review.reviewedAt)}</p>` : ''}
        </section>`;
    }
    return `
      <section class="panel">
        <h2>Результат проверки</h2>
        <p class="result warn">Работа возвращена на доработку</p>
        ${work.review && work.review.comments ? `<blockquote>${escapeHtml(work.review.comments)}</blockquote>` : ''}
        <div class="field">
          <label>Исправленная работа</label>
          <textarea id="work-content" rows="4">${escapeHtml(work.content)}</textarea>
        </div>
        <button class="btn btn-primary" id="submit-btn">Отправить повторно</button>
      </section>`;
  }

  function bind() {
    root.querySelectorAll('[data-complete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ok = await runAction(btn, () => completeStep(session.userId, lessonId, btn.dataset.complete), {
          success: 'Шаг выполнен',
        });
        if (ok) await refresh();
      });
    });

    const submitBtn = root.querySelector('#submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const content = root.querySelector('#work-content').value;
        const ok = await runAction(submitBtn, () => submitWork(session.userId, lessonId, content), {
          success: 'Работа отправлена на проверку',
        });
        if (ok) await refresh();
      });
    }
  }

  async function refresh() {
    const wasPassed = lesson.passed;
    lesson = await getLesson(lessonId, session.userId);
    render();
    if (!wasPassed && lesson.passed) toast('Урок пройден!', 'success');
  }
}
