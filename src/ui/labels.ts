import type { StructuralRole } from '../config/types'

export const ROLE_LABELS: Record<StructuralRole, string> = {
  gradeBeam: 'Grade beam / bearer',
  joist: 'Floor joist',
  rafter: 'Roof rafter',
  stud: 'Wall stud',
  plate: 'Wall plate',
  header: 'Opening header',
  batten: 'Batten',
  fascia: 'Fascia / barge',
}
