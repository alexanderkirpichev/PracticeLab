// Очередь проверки (роль «Проверяющий»): value case «проверить работу».

import { listWorksUnderReview, acceptWork, returnWork } from '../api.js';
import { escapeHtml, runAction } from '../ui.js';

export async function init(root) {
  const listEl = root.querySelector('#review-list');
  await renderList();

  async function renderList() {
    const works = await listWorksUnderReview();
    listEl.innerHTML = works.length
      ? works.map(workCard).join('')
      : '<p class="muted">Нет работ на проверке.</p>';

    works.forEach((w) => {
      const card = listEl.querySelector(`[data-work="${w.id}"]`);
      if (!card) return;
      const acceptBtn = card.querySelector('[data-accept]');
      const returnBtn = card.querySelector('[data-return]');

      acceptBtn.addEventListener('click', async () => {
        const comments = card.querySelector('[data-comments]').value;
        const ok = await runAction(acceptBtn, () => acceptWork(w.id, comments), {
          success: 'Работа принята (сдана)',
        });
        if (ok) await renderList();
      });

      returnBtn.addEventListener('click', async () => {
        const comments = card.querySelector('[data-comments]').value;
        const ok = await runAction(returnBtn, () => returnWork(w.id, comments), {
          success: 'Работа возвращена на доработку',
        });
        if (ok) await renderList();
      });
    });
  }

  function workCard(w) {
    return `
      <article class="card" data-work="${w.id}">
        <div class="card-body">
          <h2>${escapeHtml(w.lessonTitle)}</h2>
          <p class="muted">Курс: ${escapeHtml(w.courseTitle)} · Ученик: ${escapeHtml(w.studentName)}</p>
          <p class="muted">Отправок: ${w.submissionCount}</p>
          <pre class="work-content">${escapeHtml(w.content)}</pre>
        </div>
        <div class="card-actions col">
          <div class="field">
            <label>Комментарий</label>
            <textarea data-comments rows="2" placeholder="Замечания…"></textarea>
          </div>
          <div class="row">
            <button class="btn btn-primary" data-accept>Принять</button>
            <button class="btn btn-danger" data-return>Вернуть на доработку</button>
          </div>
        </div>
      </article>`;
  }
}
