// Мок-API: эмулирует сеть (задержка) и валидацию. Мутирует store из db.js.

import { store } from './db.js';

const LATENCY = 450;
const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (days) => new Date(Date.now() + days * DAY).toISOString();

function delay(ms = LATENCY) {
  return new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 200));
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000)}`;
}

const findCourse = (id) => store.courses.find((c) => c.id === id);
const findLesson = (id) => store.lessons.find((l) => l.id === id);
const findWork = (id) => store.works.find((w) => w.id === id);
const findUser = (id) => store.users.find((u) => u.id === id);

function lessonsOfCourse(courseId) {
  return store.lessons.filter((l) => l.courseId === courseId).sort((a, b) => a.order - b.order);
}
function stepsOfLesson(lessonId) {
  return store.steps.filter((s) => s.lessonId === lessonId).sort((a, b) => a.order - b.order);
}
function workOf(studentId, lessonId) {
  return store.works.find((w) => w.studentId === studentId && w.lessonId === lessonId);
}
function completedSteps(studentId, lessonId) {
  return new Set(
    store.stepCompletions
      .filter((c) => c.studentId === studentId && c.lessonId === lessonId)
      .map((c) => c.stepId)
  );
}
function publishedLessonsOfCourse(courseId) {
  return store.lessons.filter((l) => l.courseId === courseId && !l.draft).sort((a, b) => a.order - b.order);
}
function commentsOfStep(stepId) {
  return store.stepComments
    .filter((c) => c.stepId === stepId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}
function isExpired(course) {
  return !!course && !!course.deadline && new Date(course.deadline).getTime() < Date.now();
}

// ---------- Ученик ----------

export async function listActiveCourses(studentId) {
  await delay();
  const enrolled = new Set(store.progress.filter((p) => p.studentId === studentId).map((p) => p.courseId));
  return store.courses
    .filter((c) => c.status === 'active')
    .map((c) => ({ ...c, enrolled: enrolled.has(c.id) }));
}

export async function listMyCourses(studentId) {
  await delay();
  return store.progress
    .filter((p) => p.studentId === studentId)
    .map((p) => {
      const course = findCourse(p.courseId);
      return { ...course, progressStatus: p.status, lessonsCount: publishedLessonsOfCourse(course.id).length, paid: !!p.paid };
    });
}

export async function enroll(studentId, courseId) {
  await delay();
  const course = findCourse(courseId);
  if (!course) throw new Error('Курс не найден');
  if (course.status !== 'active') throw new Error('Нельзя записаться на неопубликованный курс');
  if (store.progress.some((p) => p.studentId === studentId && p.courseId === courseId)) {
    throw new Error('Вы уже записаны на этот курс');
  }
  store.progress.push({ id: uid('prg'), courseId, studentId, status: 'started' });
  return true;
}

export async function getCourse(courseId) {
  await delay();
  const course = findCourse(courseId);
  if (!course) throw new Error('Курс не найден');
  const reviewer = course.reviewerId ? findUser(course.reviewerId) : null;
  const published = publishedLessonsOfCourse(courseId);
  const developed = published.length > 0 && published.every((l) => stepsOfLesson(l.id).length > 0);
  return {
    ...course,
    reviewerName: reviewer ? reviewer.name : null,
    lessons: lessonsOfCourse(courseId).map((l) => ({ ...l, stepsCount: stepsOfLesson(l.id).length })),
    expired: isExpired(course),
    developed,
  };
}

export async function getLesson(lessonId, studentId) {
  await delay();
  const lesson = findLesson(lessonId);
  if (!lesson) throw new Error('Урок не найден');
  const course = findCourse(lesson.courseId);
  if (lesson.draft && course.authorId !== studentId) throw new Error('Урок ещё в черновике');
  const enrolled = store.progress.some((p) => p.studentId === studentId && p.courseId === course.id);
  if (!enrolled) throw new Error('Вы не записаны на этот курс');
  const steps = stepsOfLesson(lessonId);
  const done = completedSteps(studentId, lessonId);
  const stepsView = steps.map((s) => {
    const { answer, ...rest } = s;
    return { ...rest, done: done.has(s.id), comments: commentsOfStep(s.id) };
  });
  const work = workOf(studentId, lessonId);
  return {
    ...lesson,
    courseTitle: course.title,
    courseId: course.id,
    deadline: course.deadline || null,
    expired: isExpired(course),
    steps: stepsView,
    completedCount: stepsView.filter((s) => s.done).length,
    totalCount: stepsView.length,
    passed: stepsView.length > 0 && stepsView.every((s) => s.done),
    work: work ? { ...work } : null,
  };
}

export async function completeStep(studentId, lessonId, stepId) {
  await delay();
  const step = store.steps.find((s) => s.id === stepId);
  if (!step || step.lessonId !== lessonId) throw new Error('Шаг не найден');
  if (store.stepCompletions.some((c) => c.studentId === studentId && c.stepId === stepId)) {
    throw new Error('Шаг уже выполнен');
  }
  store.stepCompletions.push({ studentId, lessonId, stepId });
  return true;
}

export async function submitWork(studentId, lessonId, content) {
  await delay();
  const lesson = findLesson(lessonId);
  if (!lesson) throw new Error('Урок не найден');
  if (!lesson.hasReview) throw new Error('Этот урок без ревью — работу отправлять не нужно');
  const course = findCourse(lesson.courseId);
  if (isExpired(course)) throw new Error('Срок сдачи истёк: после окончания курса работу нельзя отправить');
  if (!content || !content.trim()) throw new Error('Введите текст работы');
  const existing = workOf(studentId, lessonId);
  if (existing && existing.status === 'under_review') {
    throw new Error('Работа уже на проверке');
  }
  if (existing) {
    existing.content = content.trim();
    existing.status = 'under_review';
    existing.submissionCount += 1;
    existing.review = null;
  } else {
    store.works.push({
      id: uid('wrk'),
      lessonId,
      studentId,
      status: 'under_review',
      submissionCount: 1,
      content: content.trim(),
      review: null,
    });
  }
  return true;
}

// ---------- Проверяющий ----------

export async function listWorksUnderReview() {
  await delay();
  return store.works
    .filter((w) => w.status === 'under_review')
    .map((w) => {
      const lesson = findLesson(w.lessonId);
      const course = lesson ? findCourse(lesson.courseId) : null;
      const student = findUser(w.studentId);
      return {
        ...w,
        lessonTitle: lesson ? lesson.title : '—',
        courseTitle: course ? course.title : '—',
        studentName: student ? student.name : '—',
        deadline: course ? course.deadline || null : null,
        expired: isExpired(course),
      };
    });
}

export async function acceptWork(workId, comments) {
  await delay();
  const work = findWork(workId);
  if (!work) throw new Error('Работа не найдена');
  if (work.status !== 'under_review') throw new Error('Работа не на проверке');
  const lesson = findLesson(work.lessonId);
  const course = lesson ? findCourse(lesson.courseId) : null;
  if (isExpired(course)) throw new Error('Срок сдачи истёк: после окончания курса оценку выставить нельзя');
  work.status = 'submitted';
  work.review = { result: 'accepted', comments: (comments || '').trim(), reviewedAt: new Date().toISOString() };
  return true;
}

export async function returnWork(workId, comments) {
  await delay();
  const work = findWork(workId);
  if (!work) throw new Error('Работа не найдена');
  if (work.status !== 'under_review') throw new Error('Работа не на проверке');
  const lesson = findLesson(work.lessonId);
  const course = lesson ? findCourse(lesson.courseId) : null;
  if (isExpired(course)) throw new Error('Срок сдачи истёк: после окончания курса оценку выставить нельзя');
  if (!comments || !comments.trim()) throw new Error('Укажите замечания для возврата на доработку');
  work.status = 'in_work';
  work.review = { result: 'returned', comments: comments.trim(), reviewedAt: new Date().toISOString() };
  work.deadline = daysFromNow(7);
  return true;
}

// ---------- Автор курса ----------

export async function listAllCourses() {
  await delay();
  return store.courses.map((c) => {
    const reviewer = c.reviewerId ? findUser(c.reviewerId) : null;
    const published = publishedLessonsOfCourse(c.id).length;
    const all = lessonsOfCourse(c.id).length;
    return {
      ...c,
      reviewerName: reviewer ? reviewer.name : null,
      lessonsCount: published,
      draftLessonsCount: all - published,
    };
  });
}

export async function listReviewers() {
  await delay();
  return store.users.filter((u) => u.role === 'reviewer');
}

export async function createCourse(authorId, title, description) {
  await delay();
  if (!title || !title.trim()) throw new Error('Укажите название курса');
  const course = {
    id: uid('crs'),
    authorId,
    title: title.trim(),
    description: (description || '').trim(),
    status: 'developing',
    reviewerId: null,
  };
  store.courses.push(course);
  return course;
}

export async function assignReviewer(courseId, reviewerId) {
  await delay();
  const course = findCourse(courseId);
  if (!course) throw new Error('Курс не найден');
  if (!reviewerId) throw new Error('Выберите проверяющего');
  if (!findUser(reviewerId)) throw new Error('Проверяющий не найден');
  if (course.status === 'active') throw new Error('Нельзя менять проверяющего у опубликованного курса');
  if (course.reviewerId) throw new Error('Проверяющий уже назначен');
  if (publishedLessonsOfCourse(courseId).length === 0) throw new Error('Курс ещё не разработан — добавьте хотя бы один опубликованный урок');
  course.reviewerId = reviewerId;
  return true;
}

export async function publishCourse(courseId) {
  await delay();
  const course = findCourse(courseId);
  if (!course) throw new Error('Курс не найден');
  if (course.status === 'active') throw new Error('Курс уже опубликован');
  if (!course.reviewerId) throw new Error('Сначала назначьте проверяющего на курс');
  if (publishedLessonsOfCourse(courseId).length === 0) throw new Error('Добавьте хотя бы один опубликованный урок перед публикацией');
  course.status = 'active';
  return true;
}

export async function setCourseDeadline(courseId, deadline) {
  await delay();
  const course = findCourse(courseId);
  if (!course) throw new Error('Курс не найден');
  course.deadline = deadline ? new Date(deadline).toISOString() : null;
  return true;
}

export async function createLesson(authorId, courseId, { title, description, hasReview, draft }) {
  await delay();
  const course = findCourse(courseId);
  if (!course) throw new Error('Курс не найден');
  if (course.authorId !== authorId) throw new Error('Вы не автор этого курса');
  if (!title || !title.trim()) throw new Error('Укажите название урока');
  const lessons = lessonsOfCourse(courseId);
  const lesson = {
    id: uid('lsn'),
    courseId,
    title: title.trim(),
    description: (description || '').trim(),
    order: lessons.length + 1,
    hasReview: !!hasReview,
    draft: !!draft,
  };
  store.lessons.push(lesson);
  return lesson;
}

export async function publishLesson(authorId, lessonId) {
  await delay();
  const lesson = findLesson(lessonId);
  if (!lesson) throw new Error('Урок не найден');
  const course = findCourse(lesson.courseId);
  if (course.authorId !== authorId) throw new Error('Вы не автор этого курса');
  if (!lesson.draft) throw new Error('Урок уже опубликован');
  lesson.draft = false;
  return true;
}

export async function addStepComment(studentId, stepId, text) {
  await delay();
  if (!text || !text.trim()) throw new Error('Введите текст комментария');
  const step = store.steps.find((s) => s.id === stepId);
  if (!step) throw new Error('Шаг не найден');
  const user = findUser(studentId);
  store.stepComments.push({
    id: uid('cmt'),
    stepId,
    studentId,
    authorName: user ? user.name : 'Ученик',
    text: text.trim(),
    createdAt: new Date().toISOString(),
  });
  return true;
}

// ---------- Практика (автопроверка решения) ----------

export async function checkPractice(studentId, lessonId, stepId, answer) {
  await delay();
  const step = store.steps.find((s) => s.id === stepId);
  if (!step || step.lessonId !== lessonId) throw new Error('Шаг не найден');
  if (step.type !== 'practice') throw new Error('Этот шаг не является практическим');
  if (store.stepCompletions.some((c) => c.studentId === studentId && c.stepId === stepId)) {
    throw new Error('Шаг уже выполнен');
  }
  const normalized = (answer || '').trim().toLowerCase();
  if (!normalized) return { ok: false, error: 'Введите решение' };
  const expected = (step.answer || '').trim().toLowerCase();
  if (normalized === expected) {
    store.stepCompletions.push({ studentId, lessonId, stepId });
    return { ok: true };
  }
  return {
    ok: false,
    error: step.hint ? `Неверное решение. Подсказка: ${step.hint}` : 'Неверное решение. Попробуйте ещё раз.',
  };
}

// ---------- Оплата курса ----------

export async function payForCourse(studentId, courseId, cardNumber) {
  await delay();
  const course = findCourse(courseId);
  if (!course) throw new Error('Курс не найден');
  if (course.status !== 'active') throw new Error('Нельзя оплатить неопубликованный курс');
  if (!course.price) throw new Error('Этот курс бесплатный — просто запишитесь');
  if (store.progress.some((p) => p.studentId === studentId && p.courseId === courseId)) {
    throw new Error('Вы уже записаны на этот курс');
  }
  const digits = (cardNumber || '').replace(/\D/g, '');
  if (digits.length < 16) throw new Error('Платёж отклонён: неверный номер карты');
  store.progress.push({ id: uid('prg'), courseId, studentId, status: 'started', paid: true });
  return true;
}

// ---------- Разработка урока (шаги, иллюстрации) ----------

export async function getLessonForEditor(lessonId, authorId) {
  await delay();
  const lesson = findLesson(lessonId);
  if (!lesson) throw new Error('Урок не найден');
  const course = findCourse(lesson.courseId);
  if (course.authorId !== authorId) throw new Error('Вы не автор этого курса');
  return {
    ...lesson,
    courseTitle: course.title,
    courseId: course.id,
    steps: stepsOfLesson(lessonId).map((s) => ({ ...s })),
  };
}

export async function createStep(authorId, lessonId, { title, type, answer, hint }) {
  await delay();
  const lesson = findLesson(lessonId);
  if (!lesson) throw new Error('Урок не найден');
  const course = findCourse(lesson.courseId);
  if (course.authorId !== authorId) throw new Error('Вы не автор этого курса');
  if (!title || !title.trim()) throw new Error('Укажите название шага');
  const steps = stepsOfLesson(lessonId);
  const isPractice = type === 'practice';
  const step = {
    id: uid('stp'),
    lessonId,
    title: title.trim(),
    order: steps.length + 1,
    type: isPractice ? 'practice' : 'reading',
    answer: isPractice ? (answer || '').trim() : undefined,
    hint: isPractice ? (hint || '').trim() : undefined,
    illustration: null,
  };
  store.steps.push(step);
  return step;
}

export async function attachIllustration(stepId) {
  await delay();
  const step = store.steps.find((s) => s.id === stepId);
  if (!step) throw new Error('Шаг не найден');
  const illustration = `https://cdn.example.com/${stepId}.png`;
  step.illustration = illustration;
  return illustration;
}

// ---------- Расписание и проведение занятия ----------

export async function listSessions(authorId) {
  await delay();
  return store.sessions
    .map((s) => {
      const course = findCourse(s.courseId);
      return { ...s, courseTitle: course ? course.title : '—' };
    })
    .filter((s) => {
      const course = findCourse(s.courseId);
      return course && course.authorId === authorId;
    })
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
}

export async function conductSession(sessionId) {
  await delay();
  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error('Занятие не найдено');
  if (session.status === 'conducted') throw new Error('Занятие уже проведено');
  session.status = 'conducted';
  return true;
}
