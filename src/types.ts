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

export interface StudyProgress {
  version: 1;
  completedWeeks: number[];
  currentWeek: number;
  notes: Record<string, string>;
  checklist: Record<string, string[]>;
  updatedAt: string;
}
