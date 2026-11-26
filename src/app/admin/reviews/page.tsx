import { EmptyState, PageHeader } from '@/components/admin/ui'

export default function AdminReviewsPage() {
  return (
    <div className="space-y-6 text-sm">
      <PageHeader title="리뷰" />
      <EmptyState>리뷰는 아직 받지 않습니다.</EmptyState>
    </div>
  )
}
