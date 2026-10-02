export type ManualPartId =
  | 'part-1'
  | 'part-2'
  | 'part-3'
  | 'part-4'
  | 'part-5'
  | 'part-6'
  | 'part-7'
  | 'part-8';

export interface ManualSubsection {
  title: string;
  objective?: string;
  targetAudience?: string;
  whenToUse?: string;
  prerequisites?: string[];
  accessPath?: string;
  interfaceOverview?: string;
  fieldsDescription?: { field: string; description: string; required?: boolean }[];
  steps?: string[];
  content: string;
  practicalExample?: string;
  expectedResult?: string;
  commonErrors?: string[];
  bestPractices?: string[];
  relatedModules?: string[];
  faq?: { question: string; answer: string }[];
  tips?: string;
  warning?: string;
}

export interface ManualChapter {
  id: string;
  number: number;
  partId: ManualPartId;
  title: string;
  iconName: string;
  category: string;
  description: string;
  relevantProfiles?: string[];
  subsections: ManualSubsection[];
}

export interface ManualPart {
  id: ManualPartId;
  number: string;
  title: string;
  description: string;
  iconName: string;
  chapters: ManualChapter[];
}

export interface TroubleshootingItem {
  id: string;
  category: string;
  problem: string;
  cause: string;
  solution: string;
  procedure: string[];
  expectedResult: string;
}

export interface QuickReferenceShortcuts {
  key: string;
  action: string;
  scope: string;
}
