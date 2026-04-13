# Схема базы данных PracticeLab

## Таблицы

### platforms
Хранит информацию о платформе обучения.

| Поле | Тип | Описание | Constraints |
|------|-----|----------|-------------|
| id | UUID | Уникальный идентификатор | PRIMARY KEY |
| name | VARCHAR(255) | Название платформы | NOT NULL |
| url | VARCHAR(500) | URL платформы | NOT NULL |
| created_at | TIMESTAMP | Дата создания | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | Дата обновления | DEFAULT CURRENT_TIMESTAMP |

### courses
Хранит информацию о курсах.

| Поле | Тип | Описание | Constraints |
|------|-----|----------|-------------|
| id | UUID | Уникальный идентификатор | PRIMARY KEY |
| platform_id | UUID | Ссылка на платформу | FOREIGN KEY (platforms.id) |
| title | VARCHAR(255) | Название курса | NOT NULL |
| description | TEXT | Описание курса | |
| lifecycle_status | ENUM('developing', 'active', 'archived') | Статус жизненного цикла | NOT NULL DEFAULT 'developing' |
| is_paid | BOOLEAN | Оплачен ли курс | DEFAULT FALSE |
| has_schedule | BOOLEAN | Есть ли расписание | DEFAULT FALSE |
| created_at | TIMESTAMP | Дата создания | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | Дата обновления | DEFAULT CURRENT_TIMESTAMP |

### lessons
Хранит информацию об уроках.

| Поле | Тип | Описание | Constraints |
|------|-----|----------|-------------|
| id | UUID | Уникальный идентификатор | PRIMARY KEY |
| course_id | UUID | Ссылка на курс | FOREIGN KEY (courses.id) |
| title | VARCHAR(255) | Название урока | NOT NULL |
| description | TEXT | Описание урока | |
| order_number | INTEGER | Порядковый номер в курсе | NOT NULL |
| has_review | BOOLEAN | Есть ли ревью | NOT NULL DEFAULT FALSE |
| is_optional | BOOLEAN | Необязательный ли урок | NOT NULL DEFAULT FALSE |
| is_first | BOOLEAN | Первый ли урок в курсе | DEFAULT FALSE |
| is_last | BOOLEAN | Последний ли урок в курсе | DEFAULT FALSE |
| created_at | TIMESTAMP | Дата создания | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | Дата обновления | DEFAULT CURRENT_TIMESTAMP |

### steps
Хранит информацию о шагах урока.

| Поле | Тип | Описание | Constraints |
|------|-----|----------|-------------|
| id | UUID | Уникальный идентификатор | PRIMARY KEY |
| lesson_id | UUID | Ссылка на урок | FOREIGN KEY (lessons.id) |
| title | VARCHAR(255) | Название шага | NOT NULL |
| description | TEXT | Описание шага | |
| order_number | INTEGER | Порядковый номер в уроке | NOT NULL |
| has_checklist | BOOLEAN | Есть ли чеклист самопроверки | DEFAULT FALSE |
| has_illustration | BOOLEAN | Есть ли иллюстрация | DEFAULT FALSE |
| created_at | TIMESTAMP | Дата создания | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | Дата обновления | DEFAULT CURRENT_TIMESTAMP |

### student_works
Хранит информацию о работах учеников.

| Поле | Тип | Описание | Constraints |
|------|-----|----------|-------------|
| id | UUID | Уникальный идентификатор | PRIMARY KEY |
| lesson_id | UUID | Ссылка на урок | FOREIGN KEY (lessons.id) |
| student_id | UUID | Идентификатор ученика | NOT NULL |
| status | ENUM('in_work', 'under_review', 'submitted') | Статус работы | NOT NULL DEFAULT 'in_work' |
| is_overdue | BOOLEAN | Есть ли отставание | DEFAULT FALSE |
| submission_count | INTEGER | Количество отправок на ревью | DEFAULT 0 |
| created_at | TIMESTAMP | Дата создания | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | Дата обновления | DEFAULT CURRENT_TIMESTAMP |
| submitted_at | TIMESTAMP | Дата отправки на ревью | |
| reviewed_at | TIMESTAMP | Дата проверки | |

### course_progress
Хранит прогресс учеников по курсам.

| Поле | Тип | Описание | Constraints |
|------|-----|----------|-------------|
| id | UUID | Уникальный идентификатор | PRIMARY KEY |
| course_id | UUID | Ссылка на курс | FOREIGN KEY (courses.id) |
| student_id | UUID | Идентификатор ученика | NOT NULL |
| progress_status | ENUM('started', 'completed') | Статус прогресса | NOT NULL DEFAULT 'started' |
| current_lesson_id | UUID | Текущий урок | FOREIGN KEY (lessons.id) |
| completed_at | TIMESTAMP | Дата завершения курса | |
| created_at | TIMESTAMP | Дата создания | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | Дата обновления | DEFAULT CURRENT_TIMESTAMP |

## Связи

1. **platforms** (1) → (N) **courses**
   - Одна платформа содержит много курсов
   - `courses.platform_id` → `platforms.id`

2. **courses** (1) → (N) **lessons**
   - Один курс содержит много уроков
   - `lessons.course_id` → `courses.id`

3. **lessons** (1) → (N) **steps**
   - Один урок содержит много шагов
   - `steps.lesson_id` → `lessons.id`

4. **lessons** (1) → (N) **student_works**
   - Один урок может иметь много работ учеников
   - `student_works.lesson_id` → `lessons.id`

5. **courses** (1) → (N) **course_progress**
   - По одному курсу может быть много записей прогресса учеников
   - `course_progress.course_id` → `courses.id`

6. **lessons** (1) → (N) **course_progress**
   - Текущий урок в прогрессе
   - `course_progress.current_lesson_id` → `lessons.id`

## Constraints

1. Уникальные индексы:
   - `UNIQUE(courses.platform_id, courses.title)` - уникальное название курса в рамках платформы
   - `UNIQUE(lessons.course_id, lessons.order_number)` - уникальный порядковый номер урока в курсе
   - `UNIQUE(steps.lesson_id, steps.order_number)` - уникальный порядковый номер шага в уроке
   - `UNIQUE(course_progress.course_id, course_progress.student_id)` - один прогресс на курс для ученика
   - `UNIQUE(student_works.lesson_id, student_works.student_id)` - одна работа на урок для ученика

2. Проверочные constraints:
   - `CHECK (lessons.has_review = TRUE OR student_works.id IS NULL)` - работа существует только для уроков с ревью
   - `CHECK (student_works.is_overdue = TRUE AND student_works.status = 'in_work')` - отставание только для работ "В работе"
   - `CHECK (courses.lifecycle_status = 'active' AND (courses.is_paid = TRUE OR courses.has_schedule = TRUE))` - оплата и расписание только для активных курсов
   - `CHECK (NOT (lessons.is_first = TRUE AND lessons.is_last = TRUE))` - урок не может быть одновременно первым и последним

## Примеры данных

### Платформа
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "PracticeLab Platform",
  "url": "https://dvmn.org",
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-01-15T10:00:00Z"
}
```

### Курс (разрабатываемый)
```json
{
  "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "platform_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Python для начинающих",
  "description": "Курс по основам программирования на Python",
  "lifecycle_status": "developing",
  "is_paid": false,
  "has_schedule": false,
  "created_at": "2026-02-01T09:00:00Z",
  "updated_at": "2026-02-01T09:00:00Z"
}
```

### Курс (активный, оплаченный, в расписании)
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "platform_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Веб-разработка на Django",
  "description": "Полный курс по созданию веб-приложений на Django",
  "lifecycle_status": "active",
  "is_paid": true,
  "has_schedule": true,
  "created_at": "2026-02-10T11:00:00Z",
  "updated_at": "2026-02-15T14:30:00Z"
}
```

### Урок (с ревью, обязательный, первый в курсе)
```json
{
  "id": "8d1e6679-8525-50de-a44b-f17fc1f90ae8",
  "course_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "title": "Введение в Python",
  "description": "Основы синтаксиса Python",
  "order_number": 1,
  "has_review": false,
  "is_optional": false,
  "is_first": true,
  "is_last": false,
  "created_at": "2026-02-10T11:30:00Z",
  "updated_at": "2026-02-10T11:30:00Z"
}
```

### Урок (с ревью, обязательный)
```json
{
  "id": "9e2f7780-9635-60ef-b55c-g28gd2g01bf9",
  "course_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "title": "HTTP протокол и REST API",
  "description": "Изучение основ HTTP и принципов REST",
  "order_number": 3,
  "has_review": true,
  "is_optional": false,
  "is_first": false,
  "is_last": false,
  "created_at": "2026-02-10T12:00:00Z",
  "updated_at": "2026-02-10T12:00:00Z"
}
```

### Шаг (с чеклистом самопроверки)
```json
{
  "id": "af308791-a746-71fg-c66d-h39he3h12cg0",
  "lesson_id": "9e2f7780-9635-60ef-b55c-g28gd2g01bf9",
  "title": "Склонируй репозиторий с GitHub",
  "description": "Клонирование учебного репозитория для начала работы",
  "order_number": 1,
  "has_checklist": true,
  "has_illustration": false,
  "created_at": "2026-02-10T12:05:00Z",
  "updated_at": "2026-02-10T12:05:00Z"
}
```

### Работа ученика (в работе)
```json
{
  "id": "bg4198a2-b857-82gh-d77e-i40if4i23dh1",
  "lesson_id": "9e2f7780-9635-60ef-b55c-g28gd2g01bf9",
  "student_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "in_work",
  "is_overdue": false,
  "submission_count": 0,
  "created_at": "2026-02-12T14:00:00Z",
  "updated_at": "2026-02-12T14:00:00Z",
  "submitted_at": null,
  "reviewed_at": null
}
```

### Работа ученика (с отставанием)
```json
{
  "id": "ch5209b3-c968-93hi-e88f-j51jg5j34ei2",
  "lesson_id": "9e2f7780-9635-60ef-b55c-g28gd2g01bf9",
  "student_id": "123e4567-e89b-12d3-a456-426614174001",
  "status": "in_work",
  "is_overdue": true,
  "submission_count": 0,
  "created_at": "2026-02-10T15:00:00Z",
  "updated_at": "2026-02-17T09:00:00Z",
  "submitted_at": null,
  "reviewed_at": null
}
```

### Прогресс курса (начатый)
```json
{
  "id": "di6310c4-da79-04ij-f99g-k62kh6k45fj3",
  "course_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "student_id": "123e4567-e89b-12d3-a456-426614174000",
  "progress_status": "started",
  "current_lesson_id": "9e2f7780-9635-60ef-b55c-g28gd2g01bf9",
  "completed_at": null,
  "created_at": "2026-02-11T10:00:00Z",
  "updated_at": "2026-02-12T14:00:00Z"
}
```

## Примеры на крайний случай

### 1. Урок без ревью (отсутствует работа ученика)
```json
{
  "id": "ej7421d5-eb8a-15jk-g00h-l73li7l56gk4",
  "course_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "title": "Чтение материалов",
  "description": "Изучение теоретических материалов",
  "order_number": 2,
  "has_review": false,
  "is_optional": false,
  "is_first": false,
  "is_last": false,
  "created_at": "2026-02-10T11:45:00Z",
  "updated_at": "2026-02-10T11:45:00Z"
}
```

*Примечание: Для этого урока не создается запись в таблице `student_works`.*

### 2. Необязательный урок с ревью (работа не учитывается в прогрессе)
```json
{
  "id": "fk8532e6-fc9b-26kl-h11i-m84mj8m67hl5",
  "course_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "title": "Дополнительные материалы",
  "description": "Расширенные темы по Django",
  "order_number": 8,
  "has_review": true,
  "is_optional": true,
  "is_first": false,
  "is_last": false,
  "created_at": "2026-02-10T13:00:00Z",
  "updated_at": "2026-02-10T13:00:00Z"
}
```

*Примечание: Работа по этому уроку разрешена, но не влияет на прогресс курса.*

### 3. Архивный курс
```json
{
  "id": "gl9643i7-jd9d-48kl-j33l-o06po0p89jn7",
  "platform_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Устаревший курс по PHP 5",
  "description": "Курс по устаревшей версии PHP",
  "lifecycle_status": "archived",
  "is_paid": false,
  "has_schedule": false,
  "created_at": "2025-06-01T10:00:00Z",
  "updated_at": "2026-01-15T14:30:00Z"
}
```

### 4. Работа ученика на проверке
```json
{
  "id": "hm0754j8-ke0e-59lm-k44m-p17qp1q90ko8",
  "lesson_id": "9e2f7780-9635-60ef-b55c-g28gd2g01bf9",
  "student_id": "123e4567-e89b-12d3-a456-426614174002",
  "status": "under_review",
  "is_overdue": false,
  "submission_count": 1,
  "created_at": "2026-02-14T16:00:00Z",
  "updated_at": "2026-02-14T16:00:00Z",
  "submitted_at": "2026-02-14T16:00:00Z",
  "reviewed_at": null
}
```

### 5. Завершенный курс (прогресс ученика)
```json
{
  "id": "in1865k9-lf1f-60mn-l55n-q28rq2r01lp9",
  "course_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "student_id": "123e4567-e89b-12d3-a456-426614174003",
  "progress_status": "completed",
  "current_lesson_id": null,
  "completed_at": "2026-03-01T15:00:00Z",
  "created_at": "2026-01-20T10:00:00Z",
  "updated_at": "2026-03-01T15:00:00Z"
}
```