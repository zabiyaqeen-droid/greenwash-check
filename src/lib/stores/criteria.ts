import { writable } from 'svelte/store';

export interface Criterion {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  importance: 'high' | 'medium' | 'low';
  dimensionId: string;
  legalBasis?: string;
}

export interface Dimension {
  id: string;
  name: string;
  weight: number;
  enabled: boolean;
  criteria: Criterion[];
  legalReference?: string;
  principle?: string;
}

// Assessment framework based on Competition Bureau's 6 Principles for Environmental Claims
// Aligned with Bill C-59 (Competition Act amendments) and ISO 14021
export const defaultDimensions: Dimension[] = [
  {
    id: 'principle1_truthful',
    name: 'Principle 1: Be Truthful',
    weight: 20,
    enabled: true,
    principle: 'Environmental claims must be truthful in both their literal meaning and general impression',
    legalReference: 'Competition Act §74.01(1)(a) - Prohibits representations that are "false or misleading in a material respect"',
    criteria: [
      { 
        id: 'literal_accuracy', 
        name: 'Literal Accuracy', 
        description: 'The literal meaning of all environmental claims must be accurate and verifiable. Under Bill C-59, businesses face penalties up to $10M (individuals) or $15M (corporations) for false claims.', 
        enabled: true, 
        importance: 'high', 
        dimensionId: 'principle1_truthful',
        legalBasis: 'Competition Bureau: Claims must be truthful in their literal meaning'
      },
      { 
        id: 'general_impression', 
        name: 'General Impression', 
        description: 'The overall impression created by environmental claims must match actual environmental performance. The Competition Bureau assesses both literal meaning AND general impression conveyed to consumers.', 
        enabled: true, 
        importance: 'high', 
        dimensionId: 'principle1_truthful',
        legalBasis: 'Competition Act requires consideration of "general impression" in addition to literal meaning'
      },
      { 
        id: 'no_exaggeration', 
        name: 'No Exaggeration', 
        description: 'Claims must not overstate environmental benefits or achievements. Even technically true statements can be misleading if they create an exaggerated impression.', 
        enabled: true, 
        importance: 'high', 
        dimensionId: 'principle1_truthful',
        legalBasis: 'Competition Bureau Principle 4: Small benefits should not be marketed as big ones'
      }
    ]
  },
  {
    id: 'principle2_substantiated',
    name: 'Principle 2: Be Substantiated',
    weight: 20,
    enabled: true,
    principle: 'Claims must be supported by adequate and proper testing conducted BEFORE making the claim',
    legalReference: 'Competition Act §74.01(1)(b.1) & (b.2) - Requires "adequate and proper testing" or "substantiation in accordance with internationally recognized methodology"',
    criteria: [
      { 
        id: 'adequate_testing', 
        name: 'Adequate Testing', 
        description: 'Environmental claims must be based on adequate and proper testing conducted BEFORE the claim was made. Testing must be fit, apt, and suitable for the circumstances of the claim.', 
        enabled: true, 
        importance: 'high', 
        dimensionId: 'principle2_substantiated',
        legalBasis: 'Competition Bureau: Testing must be conducted before making claims, not after'
      },
      { 
        id: 'recognized_methodology', 
        name: 'Recognized Methodology', 
        description: 'Business activity claims (e.g., emissions reductions, net-zero commitments) must use internationally recognized methodology such as GHG Protocol, ISO standards, or Science Based Targets.', 
        enabled: true, 
        importance: 'high', 
        dimensionId: 'principle2_substantiated',
        legalBasis: 'Competition Act §74.01(1)(b.2): Business claims must use "internationally recognized methodology"'
      },
      { 
        id: 'third_party_verification', 
        name: 'Third-Party Verification', 
        description: 'Where internationally recognized methodology requires third-party verification, such verification must be obtained. Independent verification adds credibility and reduces legal risk.', 
        enabled: true, 
        importance: 'medium', 
        dimensionId: 'principle2_substantiated',
        legalBasis: 'Competition Bureau: Third party verification required when called for by internationally recognized methodology'
      }
    ]
  },
  {
    id: 'principle3_specific',
    name: 'Principle 3: Be Specific About Comparisons',
    weight: 15,
    enabled: true,
    principle: 'Comparative claims must clearly specify what is being compared and the extent of difference',
    legalReference: 'Competition Bureau Guidance: Comparative claims require clear specification of comparison basis',
    criteria: [
      { 
        id: 'comparison_basis', 
        name: 'Clear Comparison Basis', 
        description: 'Comparative claims (e.g., "50% less emissions") must clearly specify what is being compared - previous version, competitor product, industry average, or regulatory baseline.', 
        enabled: true, 
        importance: 'high', 
        dimensionId: 'principle3_specific',
        legalBasis: 'Competition Bureau: Must specify what is being compared'
      },
      { 
        id: 'extent_of_difference', 
        name: 'Extent of Difference', 
        description: 'Claims must clearly state the extent of environmental difference or improvement. Vague comparisons like "better for the environment" without quantification are problematic.', 
        enabled: true, 
        importance: 'medium', 
        dimensionId: 'principle3_specific',
        legalBasis: 'Competition Bureau: Must specify extent of difference in comparative claims'
      },
      { 
        id: 'fair_comparisons', 
        name: 'Fair Comparisons', 
        description: 'Comparisons should be against relevant alternatives, not outdated products, cherry-picked competitors, or irrelevant benchmarks. Unfair comparisons can mislead consumers.', 
        enabled: true, 
        importance: 'medium', 
        dimensionId: 'principle3_specific',
        legalBasis: 'Competition Bureau: Comparisons must be fair and relevant'
      }
    ]
  },
  {
    id: 'principle4_proportionate',
    name: 'Principle 4: Be Proportionate',
    weight: 15,
    enabled: true,
    principle: 'Small environmental benefits should not be marketed as big ones',
    legalReference: 'Competition Bureau Guidance: Claims must be proportionate to actual environmental benefit',
    criteria: [
      { 
        id: 'proportionate_claims', 
        name: 'Proportionate Claims', 
        description: 'Environmental marketing should be proportionate to actual environmental benefit. A 2% reduction should not be marketed as a major environmental achievement.', 
        enabled: true, 
        importance: 'high', 
        dimensionId: 'principle4_proportionate',
        legalBasis: 'Competition Bureau: Small benefits should not be marketed as big ones'
      },
      { 
        id: 'materiality', 
        name: 'Materiality of Claims', 
        description: 'Claims should focus on material environmental improvements that make a meaningful difference, not trivial changes that have negligible environmental impact.', 
        enabled: true, 
        importance: 'medium', 
        dimensionId: 'principle4_proportionate',
        legalBasis: 'Competition Bureau: Focus on material environmental improvements'
      },
      { 
        id: 'no_cherry_picking', 
        name: 'No Cherry-Picking', 
        description: 'Organizations should not highlight minor environmental positives while ignoring significant environmental negatives or trade-offs in their operations.', 
        enabled: true, 
        importance: 'medium', 
        dimensionId: 'principle4_proportionate',
        legalBasis: 'ISO 14021: Claims cannot highlight one improvement while ignoring increased impacts elsewhere'
      }
    ]
  },
  {
    id: 'principle5_clear',
    name: 'Principle 5: When in Doubt, Spell it Out',
    weight: 15,
    enabled: true,
    principle: 'Environmental claims should be clear, specific, and not vague or ambiguous',
    legalReference: 'Competition Bureau Guidance: "When in doubt, spell it out" - Clarity prevents misunderstanding',
    criteria: [
      { 
        id: 'avoid_vague_terms', 
        name: 'Avoid Vague Terms', 
        description: 'Avoid vague terms like "eco-friendly", "green", "sustainable", "earth friendly", "nature\'s friend" without specific substantiation. ISO 14021 explicitly prohibits such unqualified claims.', 
        enabled: true, 
        importance: 'high', 
        dimensionId: 'principle5_clear',
        legalBasis: 'ISO 14021 & Competition Bureau: Vague claims risk misleading consumers'
      },
      { 
        id: 'scope_clarity', 
        name: 'Scope Clarity', 
        description: 'Be transparent about whether environmental claims apply to the whole product/business or just part of it. Claims about packaging should not imply the entire product is environmentally friendly.', 
        enabled: true, 
        importance: 'high', 
        dimensionId: 'principle5_clear',
        legalBasis: 'Competition Bureau: Be transparent about scope of claims'
      },
      { 
        id: 'accessible_information', 
        name: 'Accessible Information', 
        description: 'Supporting information and substantiation should be readily accessible to consumers, not buried in fine print or difficult-to-find documents.', 
        enabled: true, 
        importance: 'medium', 
        dimensionId: 'principle5_clear',
        legalBasis: 'Competition Bureau: Material information must be accessible'
      }
    ]
  },
  {
    id: 'principle6_future',
    name: 'Principle 6: Substantiate Future Claims',
    weight: 15,
    enabled: true,
    principle: 'Forward-looking claims need a clear plan, interim targets, and meaningful steps already underway',
    legalReference: 'Competition Bureau Guidance: Future environmental claims require substantiation of plans and progress',
    criteria: [
      { 
        id: 'concrete_plan', 
        name: 'Concrete Plan', 
        description: 'Net-zero and other future environmental commitments must be supported by a clear, concrete plan showing how the goal will be achieved, not just aspirational statements.', 
        enabled: true, 
        importance: 'high', 
        dimensionId: 'principle6_future',
        legalBasis: 'Competition Bureau: Future claims need clear plan'
      },
      { 
        id: 'interim_targets', 
        name: 'Interim Targets', 
        description: 'Long-term environmental commitments should include interim targets and milestones that allow progress to be tracked and verified over time.', 
        enabled: true, 
        importance: 'high', 
        dimensionId: 'principle6_future',
        legalBasis: 'Competition Bureau: Future claims need interim targets'
      },
      { 
        id: 'meaningful_steps', 
        name: 'Meaningful Steps Underway', 
        description: 'Organizations making future environmental claims should demonstrate meaningful steps already underway, not just future intentions. Actions speak louder than commitments.', 
        enabled: true, 
        importance: 'high', 
        dimensionId: 'principle6_future',
        legalBasis: 'Competition Bureau: Future claims need meaningful steps already underway'
      }
    ]
  }
];

// Flat list for backward compatibility
export const defaultCriteria: Criterion[] = defaultDimensions.flatMap(d => d.criteria);

function createCriteriaStore() {
  const { subscribe, set, update } = writable<Dimension[]>(JSON.parse(JSON.stringify(defaultDimensions)));

  return {
    subscribe,
    toggleDimension: (dimensionId: string) => {
      update(dimensions => 
        dimensions.map(d => d.id === dimensionId ? { ...d, enabled: !d.enabled } : d)
      );
    },
    toggleCriterion: (dimensionId: string, criterionId: string) => {
      update(dimensions => 
        dimensions.map(d => {
          if (d.id === dimensionId) {
            return {
              ...d,
              criteria: d.criteria.map(c => 
                c.id === criterionId ? { ...c, enabled: !c.enabled } : c
              )
            };
          }
          return d;
        })
      );
    },
    setImportance: (dimensionId: string, criterionId: string, importance: 'high' | 'medium' | 'low') => {
      update(dimensions => 
        dimensions.map(d => {
          if (d.id === dimensionId) {
            return {
              ...d,
              criteria: d.criteria.map(c => 
                c.id === criterionId ? { ...c, importance } : c
              )
            };
          }
          return d;
        })
      );
    },
    reset: () => set(JSON.parse(JSON.stringify(defaultDimensions))),
    getEnabledCriteria: () => {
      let enabled: Criterion[] = [];
      subscribe(dimensions => {
        enabled = dimensions
          .filter(d => d.enabled)
          .flatMap(d => d.criteria.filter(c => c.enabled));
      })();
      return enabled;
    },
    getEnabledDimensions: () => {
      let enabled: Dimension[] = [];
      subscribe(dimensions => {
        enabled = dimensions.filter(d => d.enabled);
      })();
      return enabled;
    }
  };
}

export const criteria = createCriteriaStore();

// Legacy toggle function for backward compatibility
export function toggle(id: string) {
  criteria.subscribe(dimensions => {
    for (const dim of dimensions) {
      const criterion = dim.criteria.find(c => c.id === id);
      if (criterion) {
        criteria.toggleCriterion(dim.id, id);
        break;
      }
    }
  })();
}
