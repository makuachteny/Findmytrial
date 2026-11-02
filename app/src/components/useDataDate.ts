import { useEffect, useState } from 'react';
import { fetchDataDate } from '../domain/registry';

/** The registry's last processing date, once a screen is showing its data. */
export function useDataDate(active: boolean): string | null {
  const [date, setDate] = useState<string | null>(null);
  useEffect(() => {
    if (active) fetchDataDate().then(setDate);
  }, [active]);
  return date;
}
