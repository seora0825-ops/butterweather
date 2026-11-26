const COLUMNS = ['상품', '별점', '내용', '작성일', '노출']

export default function AdminReviewsPage() {
  return (
    <div className="space-y-6 text-sm">
      <h1 className="font-semibold">리뷰</h1>
      <p>리뷰는 아직 받지 않습니다.</p>
      <table
        aria-label="리뷰 목록"
        className="w-full border-y border-gray-300 text-left"
      >
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column} scope="col" className="px-2 py-3 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
      </table>
    </div>
  )
}
