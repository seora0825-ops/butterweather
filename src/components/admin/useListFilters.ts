'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

export function useListFilters() {
  const params = useSearchParams()
  const urlSearch = params.get('q') ?? ''
  const [previousUrlSearch, setPreviousUrlSearch] = useState(urlSearch)
  const [search, setSearch] = useState(urlSearch)

  if (urlSearch !== previousUrlSearch) {
    setPreviousUrlSearch(urlSearch)
    setSearch(urlSearch)
  }

  function setFilters(values: Record<string, string>) {
    const url = new URL(window.location.href)
    // Keep typing responsive while Next.js publishes the history update.
    if (values.q !== undefined) setSearch(values.q)
    for (const [key, value] of Object.entries(values)) {
      if (value) url.searchParams.set(key, value)
      else url.searchParams.delete(key)
    }
    window.history.replaceState(null, '', url)
  }

  return { params, search, setFilters }
}
