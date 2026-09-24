// In-memory «база данных». Все данные живут в JS-объектах.
// Бэкенда и БД нет: действия напрямую мутируют store.

export const ROLES = {
  student:  { userId: 'stu-1', name: 'Пётр Сидоров' },
  reviewer: { userId: 'rev-1', name: 'Иван Петров' },
  author:   { userId: 'aut-1', name: 'Анна Смирнова' },
};

export const session = {
  role: 'student',
  userId: ROLES.student.userId,
  name: ROLES.student.name,
};

export function setRole(role) {
  const r = ROLES[role];
  if (!r) return;
  session.role = role;
  session.userId = r.userId;
  session.name = r.name;
}

export const store = {
  users: [
    { id: 'stu-1', name: 'Пётр Сидоров', role: 'student' },
    { id: 'rev-1', name: 'Иван Петров', role: 'reviewer' },
    { id: 'rev-2', name: 'Мария Иванова', role: 'reviewer' },
    { id: 'aut-1', name: 'Анна Смирнова', role: 'author' },
  ],

  courses: [
    {
      id: 'crs-1',
      authorId: 'aut-1',
      title: 'Python для начинающих',
      description: 'Основы программирования на Python: переменные, типы данных, функции и модули.',
      status: 'active',
      reviewerId: 'rev-1',
    },
    {
      id: 'crs-2',
      authorId: 'aut-1',
      title: 'Веб-разработка на Django',
      description: 'Создание веб-приложений на Django: модели, представления и шаблоны.',
      status: 'developing',
      reviewerId: null,
    },
    {
      id: 'crs-3',
      authorId: 'aut-1',
      title: 'HTTP и REST API',
      description: 'Протокол HTTP, методы запросов, статус-коды и принципы REST.',
      status: 'active',
      reviewerId: 'rev-2',
    },
  ],

  lessons: [
    { id: 'lsn-1', courseId: 'crs-1', title: 'Введение в Python', description: 'Переменные, типы данных и ввод-вывод.', order: 1, hasReview: false },
    { id: 'lsn-2', courseId: 'crs-1', title: 'Функции и модули', description: 'Определение функций и импорт модулей.', order: 2, hasReview: true },
    { id: 'lsn-3', courseId: 'crs-3', title: 'HTTP-протокол', description: 'Запросы, ответы и статус-коды.', order: 1, hasReview: true },
    { id: 'lsn-4', courseId: 'crs-2', title: 'Модели Django', description: 'ORM и описание моделей данных.', order: 1, hasReview: false },
  ],

  steps: [
    { id: 'stp-1', lessonId: 'lsn-1', title: 'Прочитай теорию «Переменные»', order: 1 },
    { id: 'stp-2', lessonId: 'lsn-1', title: 'Выполни практику «Калькулятор»', order: 2 },
    { id: 'stp-3', lessonId: 'lsn-2', title: 'Прочитай теорию «Функции»', order: 1 },
    { id: 'stp-4', lessonId: 'lsn-2', title: 'Выполни практику «Функция суммы»', order: 2 },
    { id: 'stp-5', lessonId: 'lsn-3', title: 'Прочитай теорию «Методы HTTP»', order: 1 },
    { id: 'stp-6', lessonId: 'lsn-3', title: 'Выполни практику «GET-запрос»', order: 2 },
    { id: 'stp-7', lessonId: 'lsn-4', title: 'Прочитай теорию «ORM»', order: 1 },
  ],

  progress: [
    { id: 'prg-1', courseId: 'crs-1', studentId: 'stu-1', status: 'started' },
  ],

  works: [
    {
      id: 'wrk-1',
      lessonId: 'lsn-2',
      studentId: 'stu-1',
      status: 'under_review',
      submissionCount: 1,
      content: 'Решение: функция sum(a, b) возвращает a + b.',
      review: null,
    },
  ],

  stepCompletions: [
    { studentId: 'stu-1', lessonId: 'lsn-1', stepId: 'stp-1' },
  ],
};
