// Общие UI-хелперы: экранирование, тосты, бейджи, запуск действия с индикацией.

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function toast(message, type = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.className = 'toast ' + type;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 2800);
}

export function statusLabel(status) {
  const map = {
    developing: 'Разрабатываемый',
    active: 'Активный',
    archived: 'Архивный',
    in_work: 'В работе',
    under_review: 'На проверке',
    submitted: 'Сдана',
    started: 'Начат',
    completed: 'Завершён',
    accepted: 'Принята',
    returned: 'Возвращена на доработку',
  };
  return map[status] || status;
}

export function statusBadge(status) {
  return `<span class="badge badge-${status}">${escapeHtml(statusLabel(status))}</span>`;
}

export function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// Запускает асинхронное действие с индикацией на кнопке и тостом об ошибке.
export async function runAction(btn, fn, { success, doneLabel } = {}) {
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = '…';
  try {
    await fn();
    toast(success || 'Готово', 'success');
    if (doneLabel) {
      btn.textContent = doneLabel;
      btn.disabled = true;
    } else {
      btn.textContent = original;
      btn.disabled = false;
    }
    return true;
  } catch (err) {
    toast(err.message, 'error');
    btn.textContent = original;
    btn.disabled = false;
    return false;
  }
}
