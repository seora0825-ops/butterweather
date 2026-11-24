import { redirect } from 'next/navigation'

/** 지금 어드민이 하는 일은 상품 관리뿐이다. 주문 화면은 결제 화면과 함께 온다 */
export default function AdminHome() {
  redirect('/admin/products')
}
