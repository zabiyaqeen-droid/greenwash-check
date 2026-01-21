/**
 * Detailed Subcategory Assessment Prompts
 * 
 * Based on G-Eval framework with chain-of-thought evaluation
 * Each prompt is tailored to its specific subcategory
 */

export interface SubcategoryPromptTemplate {
  id: string;
  name: string;
  principleId: number;
  principleName: string;
  evaluationCriteria: string;
  evaluationSteps: string[];
  scoringGuide: {
    excellent: string;
    good: string;
    needsAttention: string;
    highRisk: string;
    critical: string;
  };
  redFlags: string[];
  examples: {
    compliant: string;
    nonCompliant: string;
  };
}

export const SUBCATEGORY_PROMPTS: SubcategoryPromptTemplate[] = [
  // ============================================
  // PRINCIPLE 1: BE TRUTHFUL
  // ============================================
  {
    id: 'literal_accuracy',
    name: 'Literal Accuracy',
    principleId: 1,
    principleName: 'Principle 1: Be Truthful',
    evaluationCriteria: `Assess whether all environmental claims are literally accurate and verifiable. 
Under Bill C-59, businesses face penalties up to $10M (individuals) or $15M (corporations) for false claims.`,
    evaluationSteps: [
      'Identify all factual environmental claims (numbers, percentages, achievements)',
      'Check if each claim is specific enough to be verified',
      'Look for claims that could be technically true but misleading',
      'Assess if data sources or methodologies are referenced',
      'Flag any claims that appear exaggerated or unverifiable'
    ],
    scoringGuide: {
      excellent: '90-100: All claims are specific, verifiable, and supported by clear data',
      good: '75-89: Most claims are accurate with minor issues in specificity',
      needsAttention: '50-74: Several claims lack specificity or verifiability',
      highRisk: '25-49: Multiple claims appear inaccurate or unverifiable',
      critical: '0-24: Widespread accuracy issues, likely non-compliant'
    },
    redFlags: [
      'Round numbers without methodology (e.g., "100% sustainable")',
      'Claims without time periods or baselines',
      'Absolute claims (always, never, completely)',
      'Claims contradicted elsewhere in document'
    ],
    examples: {
      compliant: '"Reduced Scope 1 emissions by 23% from 2019 baseline, verified by third-party auditor"',
      nonCompliant: '"We are 100% sustainable" or "Carbon neutral operations" without verification'
    }
  },
  {
    id: 'general_impression',
    name: 'General Impression',
    principleId: 1,
    principleName: 'Principle 1: Be Truthful',
    evaluationCriteria: `Assess whether the overall impression created by environmental claims matches actual environmental performance. 
The Competition Bureau assesses both literal meaning AND general impression conveyed to consumers.`,
    evaluationSteps: [
      'Read claims from a consumer perspective - what impression do they create?',
      'Compare the impression with the actual substantiation provided',
      'Look for imagery, language, or framing that could mislead',
      'Check if small achievements are presented as major accomplishments',
      'Assess if negative impacts are disclosed alongside positive claims'
    ],
    scoringGuide: {
      excellent: '90-100: Impression accurately reflects actual performance, balanced disclosure',
      good: '75-89: Generally accurate impression with minor overstatements',
      needsAttention: '50-74: Impression somewhat inflated compared to actual performance',
      highRisk: '25-49: Significant gap between impression and reality',
      critical: '0-24: Highly misleading impression, classic greenwashing'
    },
    redFlags: [
      'Heavy use of green imagery without substantive claims',
      'Prominent positive claims with buried negative disclosures',
      'Aspirational language presented as achievements',
      'Industry-standard practices presented as exceptional'
    ],
    examples: {
      compliant: 'Clear distinction between current achievements and future goals',
      nonCompliant: 'Marketing materials showing pristine nature while operations have significant environmental impact'
    }
  },
  {
    id: 'no_exaggeration',
    name: 'No Exaggeration',
    principleId: 1,
    principleName: 'Principle 1: Be Truthful',
    evaluationCriteria: `Assess whether claims overstate environmental benefits or achievements. 
Even technically true statements can be misleading if they create an exaggerated impression.`,
    evaluationSteps: [
      'Identify claims that emphasize environmental benefits',
      'Assess if the magnitude of benefit is accurately represented',
      'Check if context is provided to understand significance',
      'Look for superlatives or absolute terms',
      'Compare claimed benefits to industry norms'
    ],
    scoringGuide: {
      excellent: '90-100: All claims appropriately sized, no exaggeration detected',
      good: '75-89: Minor instances of emphasis without material exaggeration',
      needsAttention: '50-74: Some claims appear inflated beyond actual benefit',
      highRisk: '25-49: Multiple exaggerated claims identified',
      critical: '0-24: Pervasive exaggeration throughout document'
    },
    redFlags: [
      'Superlatives: "industry-leading", "best-in-class", "revolutionary"',
      'Small improvements presented as transformational',
      'Pilot projects described as company-wide initiatives',
      'Future targets presented as current achievements'
    ],
    examples: {
      compliant: '"Achieved 5% reduction in water usage, contributing to our long-term conservation goals"',
      nonCompliant: '"Revolutionary sustainability transformation" for incremental improvements'
    }
  },

  // ============================================
  // PRINCIPLE 2: BE SUBSTANTIATED
  // ============================================
  {
    id: 'adequate_testing',
    name: 'Adequate Testing',
    principleId: 2,
    principleName: 'Principle 2: Be Substantiated',
    evaluationCriteria: `Assess whether environmental claims are based on adequate and proper testing conducted BEFORE the claim was made. 
Testing must be fit, apt, and suitable for the circumstances of the claim.`,
    evaluationSteps: [
      'Identify claims that require testing or measurement',
      'Check if testing methodology is disclosed',
      'Assess if testing appears adequate for the claim made',
      'Look for references to standards or protocols used',
      'Verify if testing was conducted before claims were published'
    ],
    scoringGuide: {
      excellent: '90-100: All claims backed by disclosed, appropriate testing methodologies',
      good: '75-89: Most claims substantiated, minor gaps in methodology disclosure',
      needsAttention: '50-74: Several claims lack clear testing substantiation',
      highRisk: '25-49: Many claims appear unsubstantiated',
      critical: '0-24: No evidence of adequate testing for major claims'
    },
    redFlags: [
      'Claims without any reference to measurement methodology',
      'Self-reported data without verification',
      'Testing conducted after claims were made',
      'Inappropriate testing methods for the claim type'
    ],
    examples: {
      compliant: '"Emissions measured according to GHG Protocol, data verified by [Auditor]"',
      nonCompliant: '"Reduced environmental impact" without any measurement methodology'
    }
  },
  {
    id: 'recognized_methodology',
    name: 'Recognized Methodology',
    principleId: 2,
    principleName: 'Principle 2: Be Substantiated',
    evaluationCriteria: `Assess whether business activity claims use internationally recognized methodology. 
Competition Act §74.01(1)(b.2) requires "internationally recognized methodology" for business claims.`,
    evaluationSteps: [
      'Identify claims about business environmental performance',
      'Check if recognized standards are referenced (GHG Protocol, ISO, SBTi)',
      'Assess if methodology is appropriate for the claim type',
      'Look for alignment with industry best practices',
      'Verify if methodology is applied correctly'
    ],
    scoringGuide: {
      excellent: '90-100: All claims use appropriate recognized methodologies, clearly disclosed',
      good: '75-89: Most claims reference recognized standards',
      needsAttention: '50-74: Some claims lack methodology reference',
      highRisk: '25-49: Many claims use non-standard or unclear methodologies',
      critical: '0-24: No recognized methodologies referenced'
    },
    redFlags: [
      'Proprietary methodologies without external validation',
      'Cherry-picked standards that favor the organization',
      'Outdated standards when newer versions exist',
      'Misapplication of recognized standards'
    ],
    examples: {
      compliant: '"Scope 1, 2, and 3 emissions calculated per GHG Protocol Corporate Standard"',
      nonCompliant: '"Carbon footprint reduced" using internal methodology only'
    }
  },
  {
    id: 'third_party_verification',
    name: 'Third-Party Verification',
    principleId: 2,
    principleName: 'Principle 2: Be Substantiated',
    evaluationCriteria: `Assess whether third-party verification is obtained where required. 
Independent verification adds credibility and reduces legal risk.`,
    evaluationSteps: [
      'Identify claims that would benefit from third-party verification',
      'Check if verification is disclosed and by whom',
      'Assess the credibility and independence of verifiers',
      'Look for recognized certifications (ISO 14001, B Corp, etc.)',
      'Verify scope of verification matches claims made'
    ],
    scoringGuide: {
      excellent: '90-100: Comprehensive third-party verification by credible parties',
      good: '75-89: Key claims verified, minor gaps in coverage',
      needsAttention: '50-74: Limited verification, some major claims unverified',
      highRisk: '25-49: Minimal third-party verification',
      critical: '0-24: No third-party verification despite significant claims'
    },
    redFlags: [
      'Self-certification without external validation',
      'Verification by non-independent parties',
      'Verification scope narrower than claims suggest',
      'Outdated certifications presented as current'
    ],
    examples: {
      compliant: '"Sustainability report assured by [Big 4 Firm] to ISAE 3000 standard"',
      nonCompliant: 'Major emissions claims with no external verification'
    }
  },

  // ============================================
  // PRINCIPLE 3: BE SPECIFIC ABOUT COMPARISONS
  // ============================================
  {
    id: 'comparison_basis',
    name: 'Clear Comparison Basis',
    principleId: 3,
    principleName: 'Principle 3: Be Specific About Comparisons',
    evaluationCriteria: `Assess whether comparative claims clearly specify what is being compared. 
Claims like "50% less emissions" must specify the baseline.`,
    evaluationSteps: [
      'Identify all comparative claims (more, less, better, improved)',
      'Check if baseline/comparison point is clearly stated',
      'Assess if the comparison is relevant and meaningful',
      'Look for hidden or unclear baselines',
      'Verify if comparison timeframes are specified'
    ],
    scoringGuide: {
      excellent: '90-100: All comparisons have clear, relevant baselines',
      good: '75-89: Most comparisons are clear, minor baseline issues',
      needsAttention: '50-74: Several comparisons lack clear baselines',
      highRisk: '25-49: Many vague or misleading comparisons',
      critical: '0-24: Pervasive unclear comparisons'
    },
    redFlags: [
      '"X% reduction" without stating from what',
      'Comparisons to outdated baselines',
      'Comparisons to worst-case scenarios',
      '"Improved" without quantification'
    ],
    examples: {
      compliant: '"Reduced packaging weight by 30% compared to 2020 product line"',
      nonCompliant: '"50% less plastic" without stating compared to what'
    }
  },
  {
    id: 'extent_of_difference',
    name: 'Extent of Difference',
    principleId: 3,
    principleName: 'Principle 3: Be Specific About Comparisons',
    evaluationCriteria: `Assess whether claims clearly state the extent of environmental difference or improvement. 
Vague comparisons like "better for the environment" are problematic.`,
    evaluationSteps: [
      'Identify claims about environmental improvements',
      'Check if improvements are quantified',
      'Assess if the extent is meaningful in context',
      'Look for vague improvement language',
      'Verify if units and timeframes are specified'
    ],
    scoringGuide: {
      excellent: '90-100: All improvements clearly quantified with context',
      good: '75-89: Most improvements quantified, minor gaps',
      needsAttention: '50-74: Several vague improvement claims',
      highRisk: '25-49: Many unquantified improvement claims',
      critical: '0-24: Pervasive vague claims without quantification'
    },
    redFlags: [
      '"Better", "improved", "enhanced" without numbers',
      '"Significant reduction" without defining significant',
      'Percentage improvements without absolute numbers',
      'Improvements without context of total impact'
    ],
    examples: {
      compliant: '"Reduced water consumption by 15,000 gallons annually (12% reduction)"',
      nonCompliant: '"Significantly improved environmental performance"'
    }
  },
  {
    id: 'fair_comparisons',
    name: 'Fair Comparisons',
    principleId: 3,
    principleName: 'Principle 3: Be Specific About Comparisons',
    evaluationCriteria: `Assess whether comparisons are against relevant alternatives, not outdated products, cherry-picked competitors, or irrelevant benchmarks.`,
    evaluationSteps: [
      'Identify the basis of each comparison',
      'Assess if comparisons are to relevant alternatives',
      'Check for cherry-picking favorable comparisons',
      'Look for comparisons to outdated baselines',
      'Verify if industry context is provided'
    ],
    scoringGuide: {
      excellent: '90-100: All comparisons fair and relevant',
      good: '75-89: Generally fair comparisons, minor issues',
      needsAttention: '50-74: Some unfair or misleading comparisons',
      highRisk: '25-49: Multiple unfair comparisons',
      critical: '0-24: Systematically unfair comparisons'
    },
    redFlags: [
      'Comparisons to products no longer on market',
      'Comparisons to worst performers only',
      'Comparisons that ignore relevant context',
      'Self-comparisons to artificially low baselines'
    ],
    examples: {
      compliant: '"20% more efficient than industry average per [Industry Report]"',
      nonCompliant: 'Comparing to a 20-year-old product version'
    }
  },

  // ============================================
  // PRINCIPLE 4: BE PROPORTIONATE
  // ============================================
  {
    id: 'proportionate_claims',
    name: 'Proportionate Claims',
    principleId: 4,
    principleName: 'Principle 4: Be Proportionate',
    evaluationCriteria: `Assess whether environmental marketing is proportionate to actual environmental benefit. 
A 2% reduction should not be marketed as a major environmental achievement.`,
    evaluationSteps: [
      'Identify claims about environmental achievements',
      'Assess the actual magnitude of the benefit',
      'Compare marketing emphasis to actual impact',
      'Look for minor improvements presented as major',
      'Check if context of total impact is provided'
    ],
    scoringGuide: {
      excellent: '90-100: Marketing emphasis matches actual benefit magnitude',
      good: '75-89: Generally proportionate with minor overemphasis',
      needsAttention: '50-74: Some disproportionate emphasis on minor benefits',
      highRisk: '25-49: Significant disproportionality in claims',
      critical: '0-24: Pervasive inflation of minor benefits'
    },
    redFlags: [
      'Headline claims for marginal improvements',
      'Extensive marketing for pilot projects',
      'Minor initiatives given major prominence',
      'Lack of context for claimed improvements'
    ],
    examples: {
      compliant: 'Proportionate coverage of 2% improvement as part of ongoing efforts',
      nonCompliant: 'Full-page spread celebrating 1% packaging reduction'
    }
  },
  {
    id: 'materiality',
    name: 'Materiality of Claims',
    principleId: 4,
    principleName: 'Principle 4: Be Proportionate',
    evaluationCriteria: `Assess whether claims focus on material environmental improvements that make a meaningful difference, not trivial changes.`,
    evaluationSteps: [
      'Identify the environmental issues most material to the business',
      'Check if claims address material issues',
      'Assess if trivial improvements are overemphasized',
      'Look for focus on peripheral vs. core impacts',
      'Verify if materiality assessment is disclosed'
    ],
    scoringGuide: {
      excellent: '90-100: Claims focus on material environmental issues',
      good: '75-89: Mostly material claims with some peripheral focus',
      needsAttention: '50-74: Mix of material and immaterial claims',
      highRisk: '25-49: Focus on immaterial issues, ignoring material ones',
      critical: '0-24: Systematic focus on trivial issues while ignoring major impacts'
    },
    redFlags: [
      'Office recycling emphasized while manufacturing impacts ignored',
      'Employee initiatives highlighted over operational impacts',
      'Packaging focus when product use is main impact',
      'No materiality assessment disclosed'
    ],
    examples: {
      compliant: 'Oil company focusing on Scope 1 and 3 emissions as primary concern',
      nonCompliant: 'Oil company emphasizing office paper reduction'
    }
  },
  {
    id: 'no_cherry_picking',
    name: 'No Cherry-Picking',
    principleId: 4,
    principleName: 'Principle 4: Be Proportionate',
    evaluationCriteria: `Assess whether organizations highlight minor environmental positives while ignoring significant environmental negatives or trade-offs.`,
    evaluationSteps: [
      'Identify positive environmental claims made',
      'Look for disclosure of negative impacts or trade-offs',
      'Assess if the full picture is presented',
      'Check for selective reporting of metrics',
      'Verify if improvements in one area caused issues in another'
    ],
    scoringGuide: {
      excellent: '90-100: Balanced disclosure of positives and negatives',
      good: '75-89: Generally balanced with minor omissions',
      needsAttention: '50-74: Some cherry-picking of positive metrics',
      highRisk: '25-49: Significant cherry-picking, major negatives hidden',
      critical: '0-24: Systematic hiding of negative impacts'
    },
    redFlags: [
      'Only reporting metrics that improved',
      'No mention of increased impacts in other areas',
      'Selective time periods that favor positive trends',
      'Missing Scope 3 emissions when Scope 1 & 2 are highlighted'
    ],
    examples: {
      compliant: '"While we reduced packaging, we acknowledge increased transportation emissions"',
      nonCompliant: 'Celebrating reduced water use while ignoring increased energy consumption'
    }
  },

  // ============================================
  // PRINCIPLE 5: WHEN IN DOUBT, SPELL IT OUT
  // ============================================
  {
    id: 'avoid_vague_terms',
    name: 'Avoid Vague Terms',
    principleId: 5,
    principleName: 'Principle 5: When in Doubt, Spell it Out',
    evaluationCriteria: `Assess use of vague terms like "eco-friendly", "green", "sustainable", "earth friendly", "nature's friend" without specific substantiation. 
ISO 14021 explicitly prohibits such unqualified claims.`,
    evaluationSteps: [
      'Identify use of vague environmental terms',
      'Check if vague terms are defined or substantiated',
      'Assess if specific claims accompany general terms',
      'Look for marketing buzzwords without substance',
      'Verify if terms are used in context with specifics'
    ],
    scoringGuide: {
      excellent: '90-100: No vague terms, or all terms clearly defined',
      good: '75-89: Minimal vague terms, mostly substantiated',
      needsAttention: '50-74: Several vague terms without full substantiation',
      highRisk: '25-49: Frequent use of vague, unsubstantiated terms',
      critical: '0-24: Pervasive vague terminology, classic greenwashing language'
    },
    redFlags: [
      '"Eco-friendly" without specific criteria',
      '"Sustainable" without definition',
      '"Green" products without substantiation',
      '"Natural" or "clean" without meaning',
      '"Planet-positive" or "climate-friendly" without evidence'
    ],
    examples: {
      compliant: '"Sustainably sourced: 100% FSC-certified wood from managed forests"',
      nonCompliant: '"Our eco-friendly products are good for the planet"'
    }
  },
  {
    id: 'scope_clarity',
    name: 'Scope Clarity',
    principleId: 5,
    principleName: 'Principle 5: When in Doubt, Spell it Out',
    evaluationCriteria: `Assess transparency about whether environmental claims apply to the whole product/business or just part of it. 
Claims about packaging should not imply the entire product is environmentally friendly.`,
    evaluationSteps: [
      'Identify the scope of each environmental claim',
      'Check if scope is clearly stated',
      'Assess if partial claims could be misunderstood as total',
      'Look for claims about components presented as whole-product claims',
      'Verify if organizational scope is clear (subsidiary vs. parent)'
    ],
    scoringGuide: {
      excellent: '90-100: All claims have clear, accurate scope',
      good: '75-89: Most claims have clear scope, minor ambiguities',
      needsAttention: '50-74: Several claims have unclear scope',
      highRisk: '25-49: Frequent scope ambiguity or misleading scope',
      critical: '0-24: Systematic scope misrepresentation'
    },
    redFlags: [
      'Packaging claims implying product sustainability',
      'Single product line claims suggesting company-wide practices',
      'Subsidiary achievements presented as parent company claims',
      'Pilot project scope unclear'
    ],
    examples: {
      compliant: '"This product line (representing 15% of sales) uses recycled materials"',
      nonCompliant: '"We use recycled materials" when only one product does'
    }
  },
  {
    id: 'accessible_information',
    name: 'Accessible Information',
    principleId: 5,
    principleName: 'Principle 5: When in Doubt, Spell it Out',
    evaluationCriteria: `Assess whether supporting information and substantiation is readily accessible to consumers, not buried in fine print or difficult-to-find documents.`,
    evaluationSteps: [
      'Identify claims that require supporting information',
      'Check if substantiation is easily accessible',
      'Assess if important caveats are prominently disclosed',
      'Look for buried disclaimers or fine print',
      'Verify if links to supporting data are provided'
    ],
    scoringGuide: {
      excellent: '90-100: All supporting information readily accessible',
      good: '75-89: Most information accessible, minor accessibility issues',
      needsAttention: '50-74: Some important information difficult to find',
      highRisk: '25-49: Key substantiation buried or inaccessible',
      critical: '0-24: Systematic hiding of important information'
    },
    redFlags: [
      'Footnotes with material qualifications',
      'Links to non-existent or broken pages',
      'Technical jargon without explanation',
      'Important caveats in small print'
    ],
    examples: {
      compliant: 'Clear links to methodology documents and data sources',
      nonCompliant: '"See our website for details" with no specific link'
    }
  },

  // ============================================
  // PRINCIPLE 6: SUBSTANTIATE FUTURE CLAIMS
  // ============================================
  {
    id: 'concrete_plan',
    name: 'Concrete Plan',
    principleId: 6,
    principleName: 'Principle 6: Substantiate Future Claims',
    evaluationCriteria: `Assess whether net-zero and other future environmental commitments are supported by a clear, concrete plan showing how the goal will be achieved.`,
    evaluationSteps: [
      'Identify future environmental commitments',
      'Check if specific plans are disclosed',
      'Assess if plans are concrete and actionable',
      'Look for vague intentions vs. detailed roadmaps',
      'Verify if plans include specific actions and timelines'
    ],
    scoringGuide: {
      excellent: '90-100: All future claims backed by detailed, credible plans',
      good: '75-89: Most future claims have concrete plans',
      needsAttention: '50-74: Some future claims lack concrete plans',
      highRisk: '25-49: Many aspirational claims without plans',
      critical: '0-24: Future claims with no substantive plans'
    },
    redFlags: [
      'Net-zero commitment without transition plan',
      '"We will" statements without "how"',
      'Targets without action plans',
      'Reliance on unproven technologies'
    ],
    examples: {
      compliant: '"Net-zero by 2040: See our 50-page transition plan with specific initiatives"',
      nonCompliant: '"We are committed to net-zero" with no plan disclosed'
    }
  },
  {
    id: 'interim_targets',
    name: 'Interim Targets',
    principleId: 6,
    principleName: 'Principle 6: Substantiate Future Claims',
    evaluationCriteria: `Assess whether long-term environmental commitments include interim targets and milestones that allow progress to be tracked and verified.`,
    evaluationSteps: [
      'Identify long-term environmental commitments',
      'Check for interim targets and milestones',
      'Assess if interim targets are specific and measurable',
      'Look for progress tracking mechanisms',
      'Verify if interim targets are aligned with final goals'
    ],
    scoringGuide: {
      excellent: '90-100: Comprehensive interim targets with clear milestones',
      good: '75-89: Good interim targets, minor gaps in milestones',
      needsAttention: '50-74: Some interim targets, but incomplete coverage',
      highRisk: '25-49: Few or vague interim targets',
      critical: '0-24: Long-term claims with no interim targets'
    },
    redFlags: [
      '2050 target with no 2025 or 2030 milestones',
      'Interim targets that don\'t add up to final goal',
      'No mechanism for tracking progress',
      'Interim targets without accountability'
    ],
    examples: {
      compliant: '"Net-zero by 2050 with 50% reduction by 2030 and 25% by 2025"',
      nonCompliant: '"Carbon neutral by 2050" with no interim milestones'
    }
  },
  {
    id: 'meaningful_steps',
    name: 'Meaningful Steps Underway',
    principleId: 6,
    principleName: 'Principle 6: Substantiate Future Claims',
    evaluationCriteria: `Assess whether organizations making future environmental claims demonstrate meaningful steps already underway, not just future intentions.`,
    evaluationSteps: [
      'Identify future environmental commitments',
      'Check for evidence of current actions',
      'Assess if current actions are meaningful toward goals',
      'Look for investments, projects, or changes already made',
      'Verify if progress is being reported'
    ],
    scoringGuide: {
      excellent: '90-100: Substantial current actions aligned with future goals',
      good: '75-89: Good current actions, demonstrating commitment',
      needsAttention: '50-74: Some actions underway, but limited scope',
      highRisk: '25-49: Minimal current action despite future claims',
      critical: '0-24: Future claims with no current action'
    },
    redFlags: [
      'Future commitments with no current spending',
      'Targets set but no projects started',
      'Reliance on future technology without current investment',
      'No progress reported on previous commitments'
    ],
    examples: {
      compliant: '"Invested $50M in renewable energy in 2024, part of our net-zero journey"',
      nonCompliant: '"Committed to net-zero" with no current sustainability investments'
    }
  }
];

/**
 * Build a complete assessment prompt for a subcategory
 */
export function buildDetailedSubcategoryPrompt(
  subcategoryId: string,
  claims: any[],
  documentContext: string
): string {
  const template = SUBCATEGORY_PROMPTS.find(p => p.id === subcategoryId);
  
  if (!template) {
    // Fallback to generic prompt
    return buildGenericPrompt(subcategoryId, claims, documentContext);
  }
  
  const claimsJson = JSON.stringify(claims.slice(0, 40), null, 2);
  
  return `You are an expert in Canadian environmental law, Bill C-59 greenwashing provisions, and the Competition Bureau's guidelines for environmental claims.

TASK: Assess the following environmental claims against ONE specific criterion using chain-of-thought evaluation.

═══════════════════════════════════════════════════════════════
PRINCIPLE: ${template.principleName}
CRITERION: ${template.name}
═══════════════════════════════════════════════════════════════

EVALUATION CRITERIA:
${template.evaluationCriteria}

EVALUATION STEPS (follow these in order):
${template.evaluationSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

SCORING GUIDE:
• Excellent (${template.scoringGuide.excellent})
• Good (${template.scoringGuide.good})
• Needs Attention (${template.scoringGuide.needsAttention})
• High Risk (${template.scoringGuide.highRisk})
• Critical (${template.scoringGuide.critical})

RED FLAGS TO WATCH FOR:
${template.redFlags.map(rf => `⚠️ ${rf}`).join('\n')}

EXAMPLES:
✓ Compliant: ${template.examples.compliant}
✗ Non-Compliant: ${template.examples.nonCompliant}

═══════════════════════════════════════════════════════════════
CLAIMS TO EVALUATE:
═══════════════════════════════════════════════════════════════
${claimsJson}

═══════════════════════════════════════════════════════════════
DOCUMENT CONTEXT:
═══════════════════════════════════════════════════════════════
${documentContext.slice(0, 2500)}

═══════════════════════════════════════════════════════════════
INSTRUCTIONS:
═══════════════════════════════════════════════════════════════
1. Follow the evaluation steps above systematically
2. Identify specific claims that relate to this criterion
3. Assess each relevant claim against the red flags
4. Provide specific evidence from the claims
5. Assign a score with detailed justification

Return JSON:
{
  "subcategoryId": "${subcategoryId}",
  "subcategoryName": "${template.name}",
  "principleId": ${template.principleId},
  "principleName": "${template.principleName}",
  "score": <0-100>,
  "status": "Compliant|Needs Attention|High Risk",
  "rationale": "detailed chain-of-thought explanation following the evaluation steps",
  "findings": [
    {
      "claimId": "reference to claim id",
      "issue": "specific issue identified",
      "severity": "High|Medium|Low"
    }
  ],
  "recommendations": ["specific, actionable recommendations"],
  "evidenceUsed": [
    {
      "quote": "exact quote from claims",
      "pageReference": "Page X",
      "context": "why this is relevant to ${template.name}"
    }
  ]
}`;
}

function buildGenericPrompt(subcategoryId: string, claims: any[], documentContext: string): string {
  const claimsJson = JSON.stringify(claims.slice(0, 40), null, 2);
  
  return `You are an expert in Canadian environmental law and Bill C-59 greenwashing provisions.

TASK: Assess the following environmental claims against the criterion: ${subcategoryId}

CLAIMS TO EVALUATE:
${claimsJson}

DOCUMENT CONTEXT:
${documentContext.slice(0, 2500)}

Return JSON with score (0-100), status, rationale, findings, recommendations, and evidenceUsed.`;
}

export default SUBCATEGORY_PROMPTS;
