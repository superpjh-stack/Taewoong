import { Badge, type BadgeVariant } from '@/components/ui/badge'

type LotStatus = 'active' | 'hold' | 'scrapped' | 'shipped'
type LotStage = 'incoming' | 'heating' | 'forging' | 'heat_treatment' | 'inspection' | 'shipped'

const LOT_STATUS_VARIANT: Record<LotStatus, BadgeVariant> = {
  active:   'success',
  hold:     'warn',
  scrapped: 'danger',
  shipped:  'info',
}

const LOT_STATUS_LABEL: Record<LotStatus, string> = {
  active:   '활성',
  hold:     '보류',
  scrapped: '폐기',
  shipped:  '출하',
}

const LOT_STAGE_VARIANT: Record<LotStage, BadgeVariant> = {
  incoming:      'muted',
  heating:       'warn',
  forging:       'default',
  heat_treatment: 'default',
  inspection:    'info',
  shipped:       'success',
}

const LOT_STAGE_LABEL: Record<LotStage, string> = {
  incoming:       '입고',
  heating:        '가열',
  forging:        '단조',
  heat_treatment: '열처리',
  inspection:     '검사',
  shipped:        '출하',
}

interface LotStatusBadgeProps {
  status: LotStatus
}

interface LotStageBadgeProps {
  stage: LotStage
}

export function LotStatusBadge({ status }: LotStatusBadgeProps) {
  return (
    <Badge variant={LOT_STATUS_VARIANT[status] ?? 'muted'}>
      {LOT_STATUS_LABEL[status] ?? status}
    </Badge>
  )
}

export function LotStageBadge({ stage }: LotStageBadgeProps) {
  return (
    <Badge variant={LOT_STAGE_VARIANT[stage] ?? 'muted'}>
      {LOT_STAGE_LABEL[stage] ?? stage}
    </Badge>
  )
}
