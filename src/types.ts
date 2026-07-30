export type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "code"; text: string; language: string }
  | { type: "list"; items: string[]; ordered: boolean }
  | { type: "subheading"; text: string };

export interface CourseSection {
  id: string;
  title: string;
  blocks: ContentBlock[];
}

export interface CourseWeek {
  id: string;
  week: number;
  title: string;
  stageId: string;
  stageName: string;
  stageIndex: number;
  sections: CourseSection[];
  searchText: string;
}

export interface CourseStage {
  id: string;
  index: number;
  title: string;
  shortTitle: string;
  time: string;
  weekStart: number;
  weekEnd: number;
  color: string;
}

export interface CourseData {
  generatedAt: string;
  stages: CourseStage[];
  weeks: CourseWeek[];
}

export interface UserSession {
  username: string;
  userKey: string;
  token: string;
}

export interface TutorialExercise {
  id: string;
  prompt: string;
  hint: string;
  answer: string;
}

export interface TutorialQuizQuestion {
  id: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface TutorialReference {
  label: string;
  url: string;
  source: string;
}

export interface TutorialLesson {
  id: string;
  title: string;
  summary: string;
  duration: string;
  level: "基础" | "进阶";
  objectives: string[];
  sections: CourseSection[];
  exercises: TutorialExercise[];
  quiz: TutorialQuizQuestion[];
  references: TutorialReference[];
  verification: string;
}

export interface TutorialModule {
  week: number;
  eyebrow: string;
  introduction: string;
  lessons: TutorialLesson[];
}

export interface StudyProgress {
  version: 2;
  completedWeeks: number[];
  completedLessons: string[];
  quizScores: Record<string, number>;
  currentWeek: number;
  notes: Record<string, string>;
  checklist: Record<string, string[]>;
  updatedAt: string;
}
