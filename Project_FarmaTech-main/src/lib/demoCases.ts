import type { PatientProfile } from '../types'

export interface DemoScenario {
  id: string
  label: string
  title: string
  description: string
  medicines: string[]
  profile: PatientProfile
}

const BASE: PatientProfile = {
  ageGroup: 'adult',
  isPregnant: false,
  hasRenalImpairment: false,
  hasLiverDisease: false,
  hasCardiacHistory: false,
  allergies: [],
}

/**
 * The four verified demonstration scenarios.
 *
 * They only populate the DEMO patient state. Every clinical result they produce
 * still comes from the deterministic backend — nothing here is a finding, a
 * severity or a risk score.
 */
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'case-1',
    label: 'Case 1',
    title: 'Drug Interaction',
    description: 'Clopidogrel + Warfarin sodium — verified bleeding-risk interaction in the database.',
    medicines: ['clopidogrel', 'warfarin sodium'],
    profile: { ...BASE },
  },
  {
    id: 'case-2',
    label: 'Case 2',
    title: 'Contraindication',
    description: 'Warfarin sodium with pregnancy recorded — verified contraindication rule.',
    medicines: ['warfarin sodium'],
    profile: { ...BASE, isPregnant: true },
  },
  {
    id: 'case-3',
    label: 'Case 3',
    title: 'Duplicate Therapy',
    description: 'Acetaminophen + Acetaminophen-codeine — shared active ingredient overlap.',
    medicines: ['acetaminophen', 'acetaminophen and codeine phosphate'],
    profile: { ...BASE },
  },
  {
    id: 'case-4',
    label: 'Case 4',
    title: 'No Verified Match',
    description: 'Metformin + Montelukast — no verified rule in the current database.',
    medicines: ['metformin', 'montelukast'],
    profile: { ...BASE },
  },
]