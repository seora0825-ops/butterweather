import ProductForm from '@/components/admin/ProductForm'

export default function NewProductPage() {
  return (
    <div className="flex flex-col gap-6 text-sm">
      <h1 className="font-semibold">새 상품</h1>
      <ProductForm />
    </div>
  )
}
