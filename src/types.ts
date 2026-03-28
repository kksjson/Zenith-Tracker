export type AppMode = 'habit' | 'study' | 'both';

export interface Habit {
  id: string;
  name: string;
  completedDays: string[]; // ISO dates
  streak: number;
}

export interface StudyTask {
  id: string;
  topic: string;
  completed: boolean;
}

export interface ExamInfo {
  name: string;
  date: string; // ISO date
  syllabus: string[];
  completedTopics: string[];
}

export interface UserState {
  mode: AppMode;
  habits: Habit[];
  exam: ExamInfo | null;
  themeColor: string;
  themeImage: string | null;
  lastCheckIn: string | null;
}
