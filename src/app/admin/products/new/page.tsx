import { ButtonLink, PageHeader } from '@/components/admin/ui'
import ProductForm from '@/components/admin/ProductForm'

export default function NewProductPage() {
  return (
    <div className="flex flex-col gap-6 text-sm">
      <PageHeader
        title="새 상품"
        actions={<ButtonLink href="/admin/products">상품 목록으로</ButtonLink>}
      />
      <ProductForm />
    </div>
  )
}
