import { ORDER_STATUS_LABEL } from '@/lib/orders'
import type { OrderStatus } from '@/types/order'
import { Badge } from './index'

const tones = {
  pending: 'neutral',
  paid: 'emphasis',
  shipped: 'neutral',
  done: 'quiet',
  cancelled: 'strong',
} as const satisfies Record<OrderStatus, string>

export function OrderBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={tones[status]}>{ORDER_STATUS_LABEL[status]}</Badge>
}
