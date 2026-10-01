import type { CheckResponse, DrugSearchResult, Finding, Language, PatientProfile, SimulateResponse, ViewMode } from '../types'

export const LOCAL_BRANDS: Record<string, string[]> = {
  'dolo 650': ['paracetamol'],
  'dolo': ['paracetamol'],
  'crocin': ['paracetamol'],
  'calpol': ['paracetamol'],
  'combiflam': ['ibuprofen', 'paracetamol'],
  'brufen': ['ibuprofen'],
  'voveran': ['diclofenac'],
  'zerodol': ['aceclofenac'],
  'ecosprin': ['aspirin'],
  'clopitab': ['clopidogrel'],
  'glycomet': ['metformin'],
  'pan 40': ['pantoprazole'],
  'pan': ['pantoprazole'],
  'aten': ['atenolol'],
  'amlong': ['amlodipine'],
  'telma': ['telmisartan'],
  'storvas': ['atorvastatin'],
  'lipitor': ['atorvastatin'],
  'ciplox': ['ciprofloxacin'],
  'azithral': ['azithromycin'],
  'warfarin': ['warfarin'],
  'ginkgo': ['ginkgo'],
  'ashwagandha': ['ashwagandha'],
}

export const LOCAL_CLASSES: Record<string, string> = {
  ibuprofen: 'NSAID',
  diclofenac: 'NSAID',
  aceclofenac: 'NSAID',
  atorvastatin: 'Statin',
}

export const LOCAL_INTERACTIONS = [
  {
    drugs: ['warfarin', 'aspirin'],
    severity: 'major' as const,
    mechanism: 'Additive bleeding risk (antiplatelet + anticoagulant)',
    watch: 'Blood in stool/urine, black stools, easy bruising',
  },
  {
    drugs: ['warfarin', 'ibuprofen'],
    severity: 'major' as const,
    mechanism: 'NSAID raises bleeding/GI haemorrhage risk with warfarin',
    watch: 'Black stools, vomiting blood, unusual bleeding',
  },
  {
    drugs: ['warfarin', 'diclofenac'],
    severity: 'major' as const,
    mechanism: 'NSAID raises bleeding/GI haemorrhage risk with warfarin',
    watch: 'Black stools, vomiting blood, unusual bleeding',
  },
  {
    drugs: ['warfarin', 'aceclofenac'],
    severity: 'major' as const,
    mechanism: 'NSAID raises bleeding/GI haemorrhage risk with warfarin',
    watch: 'Black stools, vomiting blood, unusual bleeding',
  },
  {
    drugs: ['warfarin', 'ciprofloxacin'],
    severity: 'major' as const,
    mechanism: 'Raised INR (CYP inhibition / gut flora disruption)',
    watch: 'Bruising, nosebleeds, blood in urine',
  },
  {
    drugs: ['warfarin', 'ginkgo'],
    severity: 'major' as const,
    mechanism: 'Herbal antiplatelet effect adds to bleeding risk',
    watch: 'Unusual bleeding or bruising',
  },
  {
    drugs: ['warfarin', 'azithromycin'],
    severity: 'moderate' as const,
    mechanism: 'May elevate INR and anticoagulation effect',
    watch: 'Unusual bleeding; INR check advised',
  },
  {
    drugs: ['warfarin', 'paracetamol'],
    severity: 'moderate' as const,
    mechanism: 'Regular high-dose paracetamol can potentiate warfarin effect',
    watch: 'Bruising; periodic INR check advised',
  },
  {
    drugs: ['aspirin', 'clopidogrel'],
    severity: 'moderate' as const,
    mechanism: 'Dual antiplatelet therapy increases gastrointestinal bleeding',
    watch: 'Black stools, prolonged bleeding from cuts',
  },
  {
    drugs: ['aspirin', 'ibuprofen'],
    severity: 'moderate' as const,
    mechanism: 'GI bleeding risk; ibuprofen can blunt aspirin cardioprotective antiplatelet effect',
    watch: 'Stomach pain, black stools',
  },
  {
    drugs: ['aspirin', 'diclofenac'],
    severity: 'moderate' as const,
    mechanism: 'Additive GI ulceration and bleeding risk',
    watch: 'Stomach pain, heartburn, black stools',
  },
  {
    drugs: ['aspirin', 'ginkgo'],
    severity: 'moderate' as const,
    mechanism: 'Additive antiplatelet action increases bleeding tendency',
    watch: 'Unusual bleeding, petechiae',
  },
  {
    drugs: ['atorvastatin', 'ciprofloxacin'],
    severity: 'moderate' as const,
    mechanism: 'CYP3A4 inhibition can increase statin levels and rhabdomyolysis risk',
    watch: 'Unexplained muscle pain, weakness, dark urine',
  },
  {
    drugs: ['atorvastatin', 'azithromycin'],
    severity: 'moderate' as const,
    mechanism: 'Macrolide interaction can elevate statin serum concentration',
    watch: 'Muscle aches, tenderness, brown urine',
  },
  {
    drugs: ['atenolol', 'amlodipine'],
    severity: 'minor' as const,
    mechanism: 'Additive hypotensive and bradycardic effect',
    watch: 'Dizziness upon standing, slow pulse, lightheadedness',
  },
  {
    drugs: ['metformin', 'pantoprazole'],
    severity: 'minor' as const,
    mechanism: 'Long-term PPI use may reduce vitamin B12 absorption with metformin',
    watch: 'Fatigue, tingling in extremities (neuropathy check)',
  },
]

export const LOCAL_FOOD_WARNINGS: Record<string, string> = {
  atorvastatin: 'Avoid Grapefruit juice (inhibits CYP3A4 metabolism, drastically increasing drug exposure).',
  lipitor: 'Avoid Grapefruit juice (inhibits CYP3A4 metabolism, drastically increasing drug exposure).',
  warfarin: 'Maintain steady intake of Vitamin K foods (spinach, kale, broccoli). Avoid alcohol & cranberries.',
  atenolol: 'Avoid high alcohol consumption (can cause severe orthostatic hypotension).',
  amlong: 'Avoid Grapefruit juice (can enhance blood pressure lowering effect excessively).',
  ciprofloxacin: 'Avoid taking with dairy products (milk, yogurt) or calcium-fortified juice (reduces absorption).',
}

const TEMPLATES = {
  en: {
    major: 'CRITICAL WARNING: These medications should not be taken together without close clinical supervision. High risk of severe adverse events.',
    moderate: 'PRECAUTION ADVISED: Potential interaction detected. Dose timing adjustment or lab monitoring is recommended.',
    minor: 'LOW RISK: Interaction is generally mild. Monitor for subtle symptoms.',
    duplicate: 'DUPLICATE INGREDIENT: The same active component is present in multiple prescribed products. Risk of inadvertent overdose.',
    food: 'DIETARY ADVISORY: Significant food-drug interaction identified.',
    contraindication: 'PATIENT CONTRAINDICATION: High caution required based on patient physiological profile.',
  },
  hi: {
    major: 'गंभीर खतरा: इन्हें साथ लेने से गंभीर नुकसान हो सकता है। जारी रखने से पहले डॉक्टर से सलाह लें।',
    moderate: 'सावधानी: इन दवाओं को साथ लेने से असर बदल सकता है। डॉक्टर या फार्मासिस्ट से पूछें।',
    minor: 'हल्का जोखिम: आमतौर पर सुरक्षित, फिर भी लक्षणों पर ध्यान दें।',
    duplicate: 'एक ही दवा दो नामों से: दोहरी खुराक का खतरा है। डॉक्टर से पूछें कौन सी बंद करनी है।',
    food: 'आहार सलाह: दवा और भोजन के बीच महत्वपूर्ण प्रभाव पाया गया।',
    contraindication: 'मरीज की स्थिति अनुसार चेतावनी: इस दवा के उपयोग में विशेष सावधानी बरतें।',
  },
  gu: {
    major: 'ગંભીર જોખમ: આ દવાઓ સાથે લેવાથી ગંભીર નુકસાન થઈ શકે છે. ચાલુ રાખતા પહેલાં ડૉક્ટરની સલાહ લો.',
    moderate: 'સાવચેતી: આ દવાઓ સાથે લેવાથી અસર બદલાઈ શકે છે. ડૉક્ટર અથવા ફાર્માસિસ્ટને પૂછો.',
    minor: 'હળવું જોખમ: સામાન્ય રીતે સલામત, છતાં લક્ષણો પર ધ્યાન રાખો.',
    duplicate: 'એક જ દવા બે નામે: બમણો ડોઝ થવાનું જોખમ છે. કઈ બંધ કરવી તે ડૉક્ટરને પૂછો.',
    food: 'આહાર સલાહ: દવા અને ખોરાક વચ્ચે સંભવિત ક્રિયા પ્રતિક્રિયા.',
    contraindication: 'દર્દીની સ્થિતિ મુજબ સાવચેતી: વિશેષ તબીબી દેખરેખ જરૂરી છે.',
  },
}

export function localSearch(query: string): DrugSearchResult[] {
  const q = query.toLowerCase().trim()
  if (!q) return []
  const results: DrugSearchResult[] = []
  for (const [name, ingredients] of Object.entries(LOCAL_BRANDS)) {
    if (name.includes(q) || ingredients.some((i) => i.includes(q))) {
      results.push({ name, ingredients })
    }
  }
  return results.slice(0, 10)
}

export function localResolve(name: string): string[] | null {
  const k = name.toLowerCase().trim()
  const cleaned = k.replace(/\s*\d+(\.\d+)?\s*(mg|mcg|g)?$/, '')
  if (LOCAL_BRANDS[k]) return LOCAL_BRANDS[k]
  if (LOCAL_BRANDS[cleaned]) return LOCAL_BRANDS[cleaned]
  const generics = Object.values(LOCAL_BRANDS).flat()
  if (generics.includes(k)) return [k]
  if (generics.includes(cleaned)) return [cleaned]
  return null
}

export function analyzeLocally(
  medicines: string[],
  view: ViewMode = 'doctor',
  language: Language = 'en',
  patient?: PatientProfile,
): CheckResponse {
  const resolved: { input: string; ingredients: string[] }[] = []
  const unresolved: string[] = []
  const owner: Record<string, string[]> = {}
  const allIngredients: string[] = []

  for (const m of medicines) {
    const ing = localResolve(m)
    if (!ing) {
      unresolved.push(m)
      continue
    }
    resolved.push({ input: m, ingredients: ing })
    for (const i of ing) {
      owner[i] = owner[i] ? [...owner[i], m] : [m]
      allIngredients.push(i)
    }
  }

  const findings: Finding[] = []
  const langKey = language in TEMPLATES ? language : 'en'
  const t = TEMPLATES[langKey]

  // 1. Duplicates
  for (const [ing, brands] of Object.entries(owner)) {
    if (brands.length > 1) {
      findings.push({
        type: 'duplicate_ingredient',
        severity: 'duplicate',
        drugs: [ing],
        medicines: brands,
        mechanism: `Active ingredient '${ing}' is present in multiple prescribed products: ${brands.join(' + ')}`,
        watch: 'Signs of cumulative toxicity and unintentional overdosage.',
        explanation: view === 'patient' ? t.duplicate : `Duplication of ${ing} via ${brands.join(', ')}`,
        recommendation: `Consolidate therapy to a single agent to avoid accidental toxic overdosage of ${ing}.`,
      })
    }
  }

  // 2. Pairwise Interactions
  const uniqueIngs = Array.from(new Set(allIngredients))
  for (let i = 0; i < uniqueIngs.length; i++) {
    for (let j = i + 1; j < uniqueIngs.length; j++) {
      const a = uniqueIngs[i]
      const b = uniqueIngs[j]
      const match = LOCAL_INTERACTIONS.find(
        (it) => (it.drugs[0] === a && it.drugs[1] === b) || (it.drugs[0] === b && it.drugs[1] === a),
      )
      if (match) {
        findings.push({
          type: 'interaction',
          severity: match.severity,
          drugs: [a, b],
          mechanism: match.mechanism,
          watch: match.watch,
          explanation:
            view === 'patient'
              ? `${t[match.severity]} (${a.toUpperCase()} + ${b.toUpperCase()})`
              : `${match.mechanism}. Watch for: ${match.watch}`,
          recommendation:
            match.severity === 'major'
              ? 'High clinical risk. Consider alternative non-interacting medication or adjust timing/dosage with specialist oversight.'
              : 'Monitor patient symptoms and relevant laboratory biomarkers.',
        })
      }
    }
  }

  // 3. Patient Profile Contraindications
  const patientWarnings: string[] = []
  if (patient) {
    if (patient.isPregnant) {
      if (allIngredients.includes('warfarin') || allIngredients.includes('aspirin') || allIngredients.includes('telmisartan')) {
        findings.push({
          type: 'contraindication',
          severity: 'major',
          drugs: allIngredients.filter((x) => ['warfarin', 'aspirin', 'telmisartan'].includes(x)),
          mechanism: 'Pregnancy Category D/X contraindication: potential teratogenicity and fetal harm.',
          watch: 'Obstetric contraindication',
          explanation: view === 'patient' ? 'ગર્ભાવસ્થામાં આ દવા સુરક્ષિત નથી.' : 'Absolute / severe pregnancy contraindication.',
          recommendation: 'Discontinue immediately and switch to pregnancy-safe alternatives under obstetrician guidance.',
        })
        patientWarnings.push('Pregnancy alert: Detected medications with known teratogenic risk.')
      }
    }
    if (patient.hasRenalImpairment && (allIngredients.includes('ibuprofen') || allIngredients.includes('diclofenac') || allIngredients.includes('aceclofenac'))) {
      findings.push({
        type: 'contraindication',
        severity: 'major',
        drugs: allIngredients.filter((x) => ['ibuprofen', 'diclofenac', 'aceclofenac'].includes(x)),
        mechanism: 'NSAIDs decrease renal blood flow and can precipitate acute kidney injury (AKI).',
        watch: 'Oliguria, edema, rising serum creatinine',
        explanation: 'Renal alert: NSAIDs contraindicated in significant renal impairment.',
        recommendation: 'Use renal-sparing analgesic (e.g., paracetamol at adjusted dosing) instead.',
      })
      patientWarnings.push('Renal alert: NSAID use in renal insufficiency.')
    }
  }

  // 4. Food Warnings
  const foodWarnings: string[] = []
  for (const m of medicines) {
    const k = m.toLowerCase().trim()
    for (const [drug, warning] of Object.entries(LOCAL_FOOD_WARNINGS)) {
      if (k.includes(drug) || (owner[drug] && owner[drug].length > 0)) {
        if (!foodWarnings.includes(warning)) {
          foodWarnings.push(warning)
        }
      }
    }
  }

  // Calculate Risk Score
  let score = 0
  for (const f of findings) {
    if (f.severity === 'major') score += 40
    else if (f.severity === 'moderate') score += 20
    else if (f.severity === 'minor') score += 5
    else if (f.severity === 'duplicate') score += 25
  }
  score = Math.min(100, score)

  const hasMajor = findings.some((f) => f.severity === 'major')
  const risk_level = score >= 60 || hasMajor ? 'high' : score >= 20 ? 'moderate' : 'low'

  return {
    resolved,
    unresolved,
    findings,
    risk_score: score,
    risk_level,
    disclaimer: 'Clinical decision support only. Not a substitute for a licensed healthcare provider judgment.',
    food_warnings: foodWarnings,
    patient_warnings: patientWarnings,
  }
}

export function simulateLocally(
  medicines: string[],
  newMedicine: string,
  view: ViewMode = 'doctor',
  language: Language = 'en',
): SimulateResponse {
  const before = analyzeLocally(medicines, view, language)
  const after = analyzeLocally([...medicines, newMedicine], view, language)

  const seen = new Set(before.findings.map((f) => `${f.type}:${f.drugs.sort().join('+')}`))
  const newFindings = after.findings.filter((f) => !seen.has(`${f.type}:${f.drugs.sort().join('+')}`))

  return {
    before_score: before.risk_score,
    after_score: after.risk_score,
    delta: after.risk_score - before.risk_score,
    new_findings: newFindings,
    risk_level: after.risk_level,
    unresolved: after.unresolved,
    disclaimer: after.disclaimer,
  }
}
