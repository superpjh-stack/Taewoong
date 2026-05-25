const PROCESS_LABELS: Record<string, string> = {
  heating: '가열',
  forging: '단조',
  heat_treatment: '열처리',
  inspection: '검사',
}

export function getProcessLabel(processType: string): string {
  return PROCESS_LABELS[processType] ?? processType
}
