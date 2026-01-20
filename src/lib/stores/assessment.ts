import { writable } from 'svelte/store';

export interface AssessmentResult {
  id: string;
  timestamp: string;
  inputType: 'text' | 'document';
  inputPreview: string;
  overallScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  summary: string;
  dimensions: {
    name: string;
    score: number;
    findings: string[];
  }[];
  keyFindings: string[];
  recommendations: string[];
}

function createAssessmentStore() {
  const { subscribe, set, update } = writable<AssessmentResult[]>([]);

  return {
    subscribe,
    add: (result: AssessmentResult) => {
      update(results => [result, ...results]);
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('greenwash_history') || '[]';
        const history = JSON.parse(stored);
        history.unshift(result);
        localStorage.setItem('greenwash_history', JSON.stringify(history.slice(0, 50)));
      }
    },
    init: () => {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('greenwash_history');
        if (stored) {
          try {
            set(JSON.parse(stored));
          } catch (e) {
            localStorage.removeItem('greenwash_history');
          }
        }
      }
    },
    clear: () => {
      set([]);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('greenwash_history');
      }
    }
  };
}

export const assessmentHistory = createAssessmentStore();
