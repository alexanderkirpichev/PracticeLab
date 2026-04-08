# Схема базы данных PracticeLab

## Таблицы

### platform
Корневая сущность - платформа обучения.

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| id | UUID | Да | Уникальный идентификатор платформы |
| name | VARCHAR(255) | Да | Название платформы |
| url | VARCHAR(500) | Да | URL платформы |
| created_at | TIMESTAMP | Да | Дата создания записи |
| updated_at | TIMESTAMP | Да | Дата последнего обновления |

### course
Курс - упорядоченный набор уроков по теме.

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| id | UUID | Да | Уникальный идентификатор курса |
| platform_id | UUID | Да | Ссылка на платформу |
| title | VARCHAR(255) | Да | Название курса |
| description | TEXT | Нет | Описание курса |
| status | ENUM | Да | Статус курса: `developing`, `available`, `archived` |
| payment_status | ENUM | Да | Статус оплаты: `unpaid`, `paid`, `scheduled` |
| is_completed | BOOLEAN | Да | Завершен ли курс |
| order_index | INTEGER | Да | Порядковый номер в рамках платформы |
| created_at | TIMESTAMP | Да | Дата создания записи |
| updated_at | TIMESTAMP | Да | Дата последнего обновления |

**Constraints:**
- `FOREIGN KEY (platform_id) REFERENCES platform(id)`
- `UNIQUE (platform_id, order_index)` - уникальный порядок в рамках платформы

### lesson
Урок - учебная единица внутри курса.

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| id | UUID | Да | Уникальный идентификатор урока |
| course_id | UUID | Да | Ссылка на курс |
| title | VARCHAR(255) | Да | Название урока |
| description | TEXT | Нет | Описание урока |
| status | ENUM | Да | Статус урока: `pending`, `current`, `completed` |
| has_review | BOOLEAN | Да | Требуется ли ревью работы |
| is_overdue | BOOLEAN | Да | Просрочен ли урок |
| order_index | INTEGER | Да | Порядковый номер в рамках курса |
| is_first_in_course | BOOLEAN | Да | Первый ли урок в курсе |
| is_last_in_course | BOOLEAN | Да | Последний ли урок в курсе |
| created_at | TIMESTAMP | Да | Дата создания записи |
| updated_at | TIMESTAMP | Да | Дата последнего обновления |

**Constraints:**
- `FOREIGN KEY (course_id) REFERENCES course(id)`
- `UNIQUE (course_id, order_index)` - уникальный порядок в рамках курса
- `CHECK (NOT (is_first_in_course AND is_last_in_course))` - урок не может быть одновременно первым и последним

### step
Шаг - минимальная единица взаимодействия ученика с уроком.

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| id | UUID | Да | Уникальный идентификатор шага |
| lesson_id | UUID | Да | Ссылка на урок |
| title | VARCHAR(255) | Да | Название шага |
| description | TEXT | Нет | Описание шага |
| type | ENUM | Да | Тип шага: `reading`, `quiz`, `practice`, `submit` |
| has_checklist | BOOLEAN | Да | Есть ли чеклист самопроверки |
| has_illustration | BOOLEAN | Да | Есть ли иллюстрация |
| order_index | INTEGER | Да | Порядковый номер в рамках урока |
| created_at | TIMESTAMP | Да | Дата создания записи |
| updated_at | TIMESTAMP | Да | Дата последнего обновления |

**Constraints:**
- `FOREIGN KEY (lesson_id) REFERENCES lesson(id)`
- `UNIQUE (lesson_id, order_index)` - уникальный порядок в рамках урока

### homework
Работа ученика - результат прохождения урока с ревью.

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| id | UUID | Да | Уникальный идентификатор работы |
| lesson_id | UUID | Да | Ссылка на урок |
| title | VARCHAR(255) | Да | Название работы |
| description | TEXT | Нет | Описание работы |
| status | ENUM | Да | Статус работы: `in_progress`, `submitted`, `accepted`, `overdue` |
| submitted_at | TIMESTAMP | Нет | Дата отправки на ревью |
| accepted_at | TIMESTAMP | Нет | Дата принятия работы |
| created_at | TIMESTAMP | Да | Дата создания записи |
| updated_at | TIMESTAMP | Да | Дата последнего обновления |

**Constraints:**
- `FOREIGN KEY (lesson_id) REFERENCES lesson(id)`
- `CHECK (NOT (submitted_at IS NOT NULL AND status = 'in_progress'))` - если отправлена, не может быть в работе
- `CHECK (NOT (accepted_at IS NOT NULL AND status != 'accepted'))` - если принята, статус должен быть accepted

## Связи

1. **platform** (1) → (N) **course** - одна платформа содержит много курсов
2. **course** (1) → (N) **lesson** - один курс содержит много уроков
3. **lesson** (1) → (N) **step** - один урок содержит много шагов
4. **lesson** (1) → (N) **homework** - один урок может иметь много работ ученика (например, при пересдачах)

## Примеры данных

### Платформа
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "PracticeLab Platform",
  "url": "https://dvmn.org",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

### Курс (разрабатываемый)
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "platform_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Python для начинающих",
  "description": "Курс по основам программирования на Python",
  "status": "developing",
  "payment_status": "unpaid",
  "is_completed": false,
  "order_index": 1,
  "created_at": "2024-01-20T14:30:00Z",
  "updated_at": "2024-01-20T14:30:00Z"
}
```

### Курс (доступный для выбора, оплаченный)
```json
{
  "id": "8d1e6679-8525-50de-a44b-f17fc1f90ae8",
  "platform_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Веб-разработка на Django",
  "description": "Полный курс по созданию веб-приложений на Django",
  "status": "available",
  "payment_status": "paid",
  "is_completed": false,
  "order_index": 2,
  "created_at": "2024-02-01T09:15:00Z",
  "updated_at": "2024-02-10T11:20:00Z"
}
```

### Урок (текущий, с ревью)
```json
{
  "id": "9e2f7780-9635-60ef-b55c-g28gd2g01bf9",
  "course_id": "8d1e6679-8525-50de-a44b-f17fc1f90ae8",
  "title": "HTTP протокол и REST API",
  "description": "Изучение основ HTTP и принципов REST",
  "status": "current",
  "has_review": true,
  "is_overdue": false,
  "order_index": 3,
  "is_first_in_course": false,
  "is_last_in_course": false,
  "created_at": "2024-02-05T10:00:00Z",
  "updated_at": "2024-02-12T15:30:00Z"
}
```

### Урок (пройденный, без ревью)
```json
{
  "id": "af308791-a746-71fg-c66d-h39he3h12cg0",
  "course_id": "8d1e6679-8525-50de-a44b-f17fc1f90ae8",
  "title": "Введение в Python",
  "description": "Основы синтаксиса Python",
  "status": "completed",
  "has_review": false,
  "is_overdue": false,
  "order_index": 1,
  "is_first_in_course": true,
  "is_last_in_course": false,
  "created_at": "2024-02-01T10:00:00Z",
  "updated_at": "2024-02-08T14:20:00Z"
}
```

### Шаг (с чеклистом и иллюстрацией)
```json
{
  "id": "bg4198a2-b857-82gh-d77e-i40if4i23dh1",
  "lesson_id": "9e2f7780-9635-60ef-b55c-g28gd2g01bf9",
  "title": "Склонируй репозиторий с GitHub",
  "description": "Клонирование учебного репозитория для начала работы",
  "type": "practice",
  "has_checklist": true,
  "has_illustration": true,
  "order_index": 1,
  "created_at": "2024-02-05T10:05:00Z",
  "updated_at": "2024-02-05T10:05:00Z"
}
```

### Шаг (отправка работы)
```json
{
  "id": "ch5209b3-c968-93hi-e88f-j51jg5j34ei2",
  "lesson_id": "9e2f7780-9635-60ef-b55c-g28gd2g01bf9",
  "title": "Отправь работу на ревью",
  "description": "Загрузка выполненной работы для проверки преподавателем",
  "type": "submit",
  "has_checklist": false,
  "has_illustration": false,
  "order_index": 6,
  "created_at": "2024-02-05T10:10:00Z",
  "updated_at": "2024-02-05T10:10:00Z"
}
```

### Работа ученика (выполненная, отправлена)
```json
{
  "id": "di6310c4-da79-04ij-f99g-k62kh6k45fj3",
  "lesson_id": "9e2f7780-9635-60ef-b55c-g28gd2g01bf9",
  "title": "Реализация REST API для блога",
  "description": "Создание API endpoints для CRUD операций с постами",
  "status": "submitted",
  "submitted_at": "2024-02-12T16:45:00Z",
  "accepted_at": null,
  "created_at": "2024-02-10T14:00:00Z",
  "updated_at": "2024-02-12T16:45:00Z"
}
```

### Работа ученика (просроченная)
```json
{
  "id": "ej7421d5-eb8a-15jk-g00h-l73li7l56gk4",
  "lesson_id": "af308791-a746-71fg-c66d-h39he3h12cg0",
  "title": "Практика с базовыми типами данных",
  "description": "Упражнения со списками, словарями и кортежами",
  "status": "overdue",
  "submitted_at": null,
  "accepted_at": null,
  "created_at": "2024-02-03T11:00:00Z",
  "updated_at": "2024-02-10T09:00:00Z"
}
```

### Крайний случай: отсутствует работа для урока без ревью
```json
{
  "id": "fk8532e6-fc9b-26kl-h11i-m84mj8m67hl5",
  "lesson_id": "af308791-a746-71fg-c66d-h39he3h12cg0",
  "title": null,
  "description": null,
  "status": null,
  "submitted_at": null,
  "accepted_at": null,
  "created_at": "2024-02-01T10:00:00Z",
  "updated_at": "2024-02-01T10:00:00Z"
}
```
*Примечание: Для урока без ревью (`has_review: false`) работа может быть создана с пустыми полями, что указывает на отсутствие необходимости в работе.*