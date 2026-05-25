export const PROCESS_TYPE_OPTS = [
  { value: 'heating', label: '가열' },
  { value: 'forging', label: '단조' },
  { value: 'heat_treatment', label: '열처리' },
  { value: 'inspection', label: '검사' },
] as const

export type ProcessType = 'heating' | 'forging' | 'heat_treatment' | 'inspection'

export function getProcessLabel(type: string): string {
  return PROCESS_TYPE_OPTS.find((o) => o.value === type)?.label ?? type
}
