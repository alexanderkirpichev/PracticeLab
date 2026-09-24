// Разработка урока (роль «Автор курса»): value case «разработать курс».

import { getLessonForEditor, createStep, attachIllustration } from '../api.js';
import { session } from '../db.js';
import { escapeHtml, runAction } from '../ui.js';

export async function init(root, params) {
  const lessonId = params[0];
  let lesson = await getLessonForEditor(lessonId, session.userId);

  render();

  function render() {
    root.querySelector('#lesson-editor-root').innerHTML = `
      <div class="page-head">
        <p class="muted"><a href="#/course/${lesson.courseId}">← ${escapeHtml(lesson.courseTitle)}</a></p>
        <h1>${escapeHtml(lesson.title)}</h1>
        <p class="muted">${escapeHtml(lesson.description)}</p>
        <div class="meta">
          ${lesson.hasReview ? '<span class="badge badge-under_review">С ревью</span>' : ''}
          ${lesson.draft ? '<span class="badge badge-draft">Черновик</span>' : ''}
          <span class="muted">Шагов: ${lesson.steps.length}</span>
        </div>
      </div>

      <section class="panel">
        <h2>Шаги урока</h2>
        ${lesson.steps.length
          ? `<div class="list">${lesson.steps.map(stepItem).join('')}</div>`
          : '<p class="muted">Шагов пока нет — добавьте первый шаг ниже.</p>'}
      </section>

      <section class="panel">
        <h2>Добавить шаг</h2>
        <div class="field">
          <label>Название шага</label>
          <input id="step-title" type="text" placeholder="Например, «Прочитай теорию»" />
        </div>
        <div class="field">
          <label>Тип шага</label>
          <select id="step-type">
            <option value="reading">Теория (без проверки)</option>
            <option value="practice">Практика (автопроверка решения)</option>
          </select>
        </div>
        <div id="practice-fields" hidden>
          <div class="field">
            <label>Правильный ответ</label>
            <input id="step-answer" type="text" placeholder="Например, print(2 + 2)" />
          </div>
          <div class="field">
            <label>Подсказка</label>
            <input id="step-hint" type="text" placeholder="Подсказка для ученика" />
          </div>
        </div>
        <button class="btn btn-primary" id="add-step-btn">Добавить шаг</button>
      </section>
    `;
    bind();
  }

  function stepItem(s) {
    const isPractice = s.type === 'practice';
    return `
      <div class="list-item">
        <div>
          <strong>${s.order}. ${escapeHtml(s.title)}</strong>
          ${isPractice ? '<span class="badge badge-practice">Практика</span>' : '<span class="muted">Теория</span>'}
          ${isPractice && s.answer ? `<div class="muted">Ответ: ${escapeHtml(s.answer)}</div>` : ''}
          ${s.illustration ? `<div class="muted illus">📎 ${escapeHtml(s.illustration)}</div>` : ''}
        </div>
        <div class="row">
          ${s.illustration ? '<span class="muted">Иллюстрация есть</span>' : `<button class="btn btn-secondary btn-sm" data-illustration="${s.id}">Получить иллюстрацию</button>`}
        </div>
      </div>`;
  }

  function bind() {
    const typeSelect = root.querySelector('#step-type');
    const practiceFields = root.querySelector('#practice-fields');

    typeSelect.addEventListener('change', () => {
      practiceFields.hidden = typeSelect.value !== 'practice';
    });

    const addBtn = root.querySelector('#add-step-btn');
    addBtn.addEventListener('click', async () => {
      const title = root.querySelector('#step-title').value;
      const type = typeSelect.value;
      const answer = root.querySelector('#step-answer').value;
      const hint = root.querySelector('#step-hint').value;
      const ok = await runAction(addBtn, () => createStep(session.userId, lessonId, { title, type, answer, hint }), {
        success: 'Шаг добавлен',
      });
      if (ok) await refresh();
    });

    root.querySelectorAll('[data-illustration]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ok = await runAction(btn, () => attachIllustration(btn.dataset.illustration), {
          success: 'Иллюстрация добавлена',
        });
        if (ok) await refresh();
      });
    });
  }

  async function refresh() {
    lesson = await getLessonForEditor(lessonId, session.userId);
    render();
  }
}
