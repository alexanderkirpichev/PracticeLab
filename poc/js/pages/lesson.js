// Страница урока (роль «Ученик»): шаги («пройти урок»),
// отправка работы («отправить работу на проверку») и результат («увидеть результат проверки»).

import { getLesson, completeStep, submitWork, addStepComment, checkPractice } from '../api.js';
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
        ${lesson.deadline ? `<p class="muted">Дата окончания курса: ${fmtDate(lesson.deadline)}${lesson.expired ? ' <span class="result warn">— срок истёк</span>' : ''}</p>` : ''}
      </div>

      <section class="panel">
        <h2>Шаги урока <span class="muted">(${lesson.completedCount}/${lesson.totalCount})</span></h2>
        ${lesson.passed ? '<p class="result ok">Урок пройден ✓</p>' : ''}
        <ul class="steps">
          ${lesson.steps.map(stepBlock).join('')}
        </ul>
      </section>

      ${lesson.hasReview ? workBlock(work) : ''}
    `;
    bind();
  }

  function stepBlock(s) {
    const isPractice = s.type === 'practice';
    const action = s.done
      ? '<span class="step-done">Выполнено ✓</span>'
      : (isPractice
          ? '<span class="badge badge-practice">Практика</span>'
          : `<button class="btn btn-secondary btn-sm" data-complete="${s.id}">Выполнить</button>`);
    return `
      <li class="step-block ${s.done ? 'done' : ''}">
        <div class="step">
          <span class="step-title">${escapeHtml(s.title)}</span>
          ${action}
        </div>
        ${s.illustration ? illusNote(s.illustration) : ''}
        ${!s.done && isPractice ? practiceBox(s) : ''}
        <div class="step-comments">
          <button class="btn btn-secondary btn-sm" data-toggle-comments="${s.id}">Комментарии (${s.comments.length})</button>
        </div>
        <div class="comments-box" data-comments-box="${s.id}" hidden>
          ${commentList(s.comments)}
          <div class="field">
            <textarea data-comment-text rows="2" placeholder="Ваш комментарий к шагу…"></textarea>
          </div>
          <button class="btn btn-primary btn-sm" data-send-comment="${s.id}">Отправить комментарий</button>
        </div>
      </li>`;
  }

  function practiceBox(s) {
    return `
      <div class="practice-box">
        ${s.hint ? `<p class="muted">Подсказка: ${escapeHtml(s.hint)}</p>` : ''}
        <div class="field">
          <textarea data-answer rows="3" placeholder="Введите решение…"></textarea>
        </div>
        <button class="btn btn-primary btn-sm" data-check="${s.id}">Проверить решение</button>
        <p class="practice-error result warn" data-error="${s.id}" hidden></p>
      </div>`;
  }

  function illusNote(url) {
    return `<p class="muted illus">📎 Иллюстрация: ${escapeHtml(url)}</p>`;
  }

  function commentList(comments) {
    if (!comments.length) return '<p class="muted">Комментариев пока нет.</p>';
    return `<ul class="comments">${comments.map((c) => `
      <li>
        <div class="comment-meta"><strong>${escapeHtml(c.authorName)}</strong> · ${fmtDate(c.createdAt)}</div>
        <div>${escapeHtml(c.text)}</div>
      </li>`).join('')}</ul>`;
  }

  function workBlock(work) {
    if (!work) {
      const expired = lesson.expired;
      return `
        <section class="panel">
          <h2>Работа по уроку</h2>
          ${expired ? '<p class="result warn">Срок сдачи истёк — работа не может быть отправлена.</p>' : ''}
          <div class="field">
            <label>Текст работы</label>
            <textarea id="work-content" rows="4" placeholder="Опишите решение…" ${expired ? 'disabled' : ''}></textarea>
          </div>
          <button class="btn btn-primary" id="submit-btn" ${expired ? 'disabled' : ''}>Отправить на проверку</button>
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
        ${deadlineNote(work)}
        ${lesson.expired ? '<p class="result warn">Срок сдачи истёк — работа не может быть отправлена повторно.</p>' : ''}
        <div class="field">
          <label>Исправленная работа</label>
          <textarea id="work-content" rows="4" ${lesson.expired ? 'disabled' : ''}>${escapeHtml(work.content)}</textarea>
        </div>
        <button class="btn btn-primary" id="submit-btn" ${lesson.expired ? 'disabled' : ''}>Отправить повторно</button>
      </section>`;
  }

  function deadlineNote(work) {
    if (!work.deadline) return '';
    const d = new Date(work.deadline);
    const overdue = d.getTime() < Date.now();
    const approaching = !overdue && (d.getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000;
    let note = '';
    if (overdue) note = '<p class="result warn">⚠ Работа с отставанием — срок сдачи превышен</p>';
    else if (approaching) note = '<p class="result warn">⚠ Приближается срок сдачи работы</p>';
    return `<p class="muted">Срок сдачи работы: ${fmtDate(work.deadline)}</p>${note}`;
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

    root.querySelectorAll('[data-check]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const box = btn.closest('.practice-box');
        const answer = box ? box.querySelector('[data-answer]').value : '';
        const errorEl = root.querySelector(`[data-error="${btn.dataset.check}"]`);
        const original = btn.textContent;
        btn.disabled = true;
        btn.textContent = '…';
        try {
          const res = await checkPractice(session.userId, lessonId, btn.dataset.check, answer);
          if (res.ok) {
            toast('Решение принято', 'success');
            await refresh();
          } else {
            if (errorEl) { errorEl.textContent = res.error; errorEl.hidden = false; }
            btn.textContent = original;
            btn.disabled = false;
          }
        } catch (err) {
          toast(err.message, 'error');
          btn.textContent = original;
          btn.disabled = false;
        }
      });
    });

    root.querySelectorAll('[data-toggle-comments]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const box = root.querySelector(`[data-comments-box="${btn.dataset.toggleComments}"]`);
        if (box) box.hidden = !box.hidden;
      });
    });

    root.querySelectorAll('[data-send-comment]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const box = root.querySelector(`[data-comments-box="${btn.dataset.sendComment}"]`);
        const text = box ? box.querySelector('[data-comment-text]').value : '';
        const ok = await runAction(btn, () => addStepComment(session.userId, btn.dataset.sendComment, text), {
          success: 'Комментарий добавлен',
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
