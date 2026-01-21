import { writable } from 'svelte/store';

export interface PrincipleScore {
  principle: string;
  description: string;
  score: number;
  status: string;
  subcategories: {
    name: string;
    score: number;
    status: string;
    rationale: string;
    issues: string[];
    recommendations: string[];
  }[];
}

export interface Issue {
  id: number;
  severity: string;
  title: string;
  description: string;
  evidence: string;
  recommendation: string;
  principle: string;
  legalRisk: string;
}

export interface AssessmentResult {
  id: string;
  timestamp: string;
  inputType: 'text' | 'document';
  inputPreview: string;
  fileName?: string;
  overallScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | string;
  summary: string;
  executiveSummary?: string;
  
  // Full assessment data
  principleScores?: PrincipleScore[];
  top20Issues?: Issue[];
  positiveFindings?: {
    title: string;
    description: string;
    principle: string;
  }[];
  claimsAnalyzed?: number;
  
  // Legacy fields for backward compatibility
  dimensions?: {
    name: string;
    score: number;
    findings: string[];
  }[];
  keyFindings?: string[];
  recommendations?: string[];
  
  // Metadata
  metadata?: {
    fileName?: string;
    pageCount?: number;
    analysisMode?: string;
    processingTime?: number;
  };
}

function createAssessmentStore() {
  const { subscribe, set, update } = writable<AssessmentResult[]>([]);

  return {
    subscribe,
    add: (result: AssessmentResult) => {
      console.log('[History] Adding assessment to history:', result.id);
      update(results => [result, ...results]);
      if (typeof localStorage !== 'undefined') {
        try {
          const stored = localStorage.getItem('greenwash_history') || '[]';
          const history = JSON.parse(stored);
          history.unshift(result);
          // Store up to 20 full assessments (increased storage for full data)
          const dataToStore = JSON.stringify(history.slice(0, 20));
          console.log('[History] Storing data size:', (dataToStore.length / 1024).toFixed(2), 'KB');
          localStorage.setItem('greenwash_history', dataToStore);
          console.log('[History] Successfully saved to localStorage');
        } catch (e) {
          console.error('[History] Failed to save to localStorage:', e);
          // If localStorage is full, try storing less data
          if (e instanceof DOMException && e.name === 'QuotaExceededError') {
            console.warn('[History] localStorage quota exceeded, storing minimal data');
            try {
              const minimalResult = {
                id: result.id,
                timestamp: result.timestamp,
                inputType: result.inputType,
                inputPreview: result.inputPreview,
                fileName: result.fileName,
                overallScore: result.overallScore,
                riskLevel: result.riskLevel,
                summary: result.summary?.slice(0, 500),
                claimsAnalyzed: result.claimsAnalyzed
              };
              const stored = localStorage.getItem('greenwash_history') || '[]';
              const history = JSON.parse(stored);
              history.unshift(minimalResult);
              localStorage.setItem('greenwash_history', JSON.stringify(history.slice(0, 10)));
            } catch (e2) {
              console.error('[History] Even minimal storage failed:', e2);
            }
          }
        }
      }
    },
    get: (id: string): AssessmentResult | undefined => {
      let found: AssessmentResult | undefined;
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('greenwash_history');
        if (stored) {
          try {
            const history = JSON.parse(stored) as AssessmentResult[];
            found = history.find(h => h.id === id);
          } catch (e) {
            // ignore
          }
        }
      }
      return found;
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
    },
    delete: (id: string) => {
      update(results => results.filter(r => r.id !== id));
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('greenwash_history');
        if (stored) {
          try {
            const history = JSON.parse(stored) as AssessmentResult[];
            const filtered = history.filter(h => h.id !== id);
            localStorage.setItem('greenwash_history', JSON.stringify(filtered));
          } catch (e) {
            // ignore
          }
        }
      }
    }
  };
}

export const assessmentHistory = createAssessmentStore();
