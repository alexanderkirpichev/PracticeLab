// Мок-API: эмулирует сеть (задержка) и валидацию. Мутирует store из db.js.

import { store } from './db.js';

const LATENCY = 450;

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
      return { ...course, progressStatus: p.status, lessonsCount: lessonsOfCourse(course.id).length };
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
  return {
    ...course,
    reviewerName: reviewer ? reviewer.name : null,
    lessons: lessonsOfCourse(courseId),
  };
}

export async function getLesson(lessonId, studentId) {
  await delay();
  const lesson = findLesson(lessonId);
  if (!lesson) throw new Error('Урок не найден');
  const course = findCourse(lesson.courseId);
  const enrolled = store.progress.some((p) => p.studentId === studentId && p.courseId === course.id);
  if (!enrolled) throw new Error('Вы не записаны на этот курс');
  const steps = stepsOfLesson(lessonId);
  const done = completedSteps(studentId, lessonId);
  const stepsView = steps.map((s) => ({ ...s, done: done.has(s.id) }));
  const work = workOf(studentId, lessonId);
  return {
    ...lesson,
    courseTitle: course.title,
    courseId: course.id,
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
      };
    });
}

export async function acceptWork(workId, comments) {
  await delay();
  const work = findWork(workId);
  if (!work) throw new Error('Работа не найдена');
  if (work.status !== 'under_review') throw new Error('Работа не на проверке');
  work.status = 'submitted';
  work.review = { result: 'accepted', comments: (comments || '').trim(), reviewedAt: new Date().toISOString() };
  return true;
}

export async function returnWork(workId, comments) {
  await delay();
  const work = findWork(workId);
  if (!work) throw new Error('Работа не найдена');
  if (work.status !== 'under_review') throw new Error('Работа не на проверке');
  if (!comments || !comments.trim()) throw new Error('Укажите замечания для возврата на доработку');
  work.status = 'in_work';
  work.review = { result: 'returned', comments: comments.trim(), reviewedAt: new Date().toISOString() };
  return true;
}

// ---------- Автор курса ----------

export async function listAllCourses() {
  await delay();
  return store.courses.map((c) => {
    const reviewer = c.reviewerId ? findUser(c.reviewerId) : null;
    return {
      ...c,
      reviewerName: reviewer ? reviewer.name : null,
      lessonsCount: lessonsOfCourse(c.id).length,
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
  if (lessonsOfCourse(courseId).length === 0) throw new Error('Курс ещё не разработан — добавьте хотя бы один урок');
  course.reviewerId = reviewerId;
  return true;
}

export async function publishCourse(courseId) {
  await delay();
  const course = findCourse(courseId);
  if (!course) throw new Error('Курс не найден');
  if (course.status === 'active') throw new Error('Курс уже опубликован');
  if (!course.reviewerId) throw new Error('Сначала назначьте проверяющего на курс');
  if (lessonsOfCourse(courseId).length === 0) throw new Error('Добавьте хотя бы один урок перед публикацией');
  course.status = 'active';
  return true;
}
