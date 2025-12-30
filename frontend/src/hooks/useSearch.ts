import { useState } from 'react';

/**
 * 검색 UI 상태 Hook
 */
export function useSearch() {
  const [searchTab, setSearchTab] = useState<"route" | "station">("route");

  return {
    searchTab,
    setSearchTab,
  };
}
