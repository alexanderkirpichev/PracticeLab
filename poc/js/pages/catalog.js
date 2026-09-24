// Каталог курсов (роль «Ученик»): value cases «записаться на курс» и «оплатить курс».

import { listActiveCourses, enroll, payForCourse } from '../api.js';
import { session } from '../db.js';
import { escapeHtml, runAction, toast } from '../ui.js';

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
    const action = c.enrolled
      ? '<span class="muted">Вы записаны</span>'
      : (c.price
        ? `<div class="row"><span class="price">${escapeHtml(c.price)} ₽</span><button class="btn btn-primary" data-pay="${c.id}">Оплатить и записаться</button></div>`
        : `<button class="btn btn-primary" data-enroll="${c.id}">Записаться</button>`);
    return `
      <article class="card">
        <div class="card-body">
          <h2>${escapeHtml(c.title)}</h2>
          <p class="muted">${escapeHtml(c.description)}</p>
        </div>
        <div class="card-actions">${action}</div>
      </article>`;
  }

  function payFormHtml(courseId) {
    return `
      <div class="pay-form">
        <div class="field">
          <label>Номер карты</label>
          <input data-card type="text" placeholder="0000 0000 0000 0000" />
        </div>
        <div class="row">
          <button class="btn btn-primary" data-confirm-pay="${courseId}">Оплатить</button>
          <button class="btn btn-secondary" data-cancel-pay>Отменить</button>
        </div>
      </div>`;
  }

  listEl.addEventListener('click', async (e) => {
    const enrollBtn = e.target.closest('[data-enroll]');
    const payBtn = e.target.closest('[data-pay]');
    const confirmPayBtn = e.target.closest('[data-confirm-pay]');
    const cancelPayBtn = e.target.closest('[data-cancel-pay]');

    if (enrollBtn) {
      const ok = await runAction(enrollBtn, () => enroll(session.userId, enrollBtn.dataset.enroll), {
        success: 'Вы записаны на курс',
      });
      if (ok) await render();
      return;
    }

    if (payBtn) {
      const card = payBtn.closest('.card');
      card.querySelector('.card-actions').innerHTML = payFormHtml(payBtn.dataset.pay);
      return;
    }

    if (confirmPayBtn) {
      const card = confirmPayBtn.closest('.card');
      const cardNumber = card.querySelector('[data-card]').value;
      const ok = await runAction(confirmPayBtn, () => payForCourse(session.userId, confirmPayBtn.dataset.confirmPay, cardNumber), {
        success: 'Курс оплачен — вы записаны',
      });
      if (ok) await render();
      return;
    }

    if (cancelPayBtn) {
      await render();
      toast('Платёж отклонён', 'error');
    }
  });
}
