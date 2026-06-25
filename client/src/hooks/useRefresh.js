import { useState, useCallback } from 'react';

/**
 * Pull-to-refresh helper hook.
 * @param {Function} refreshFn - Async function to call on refresh
 */
const useRefresh = (refreshFn) => {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshFn();
    } finally {
      setRefreshing(false);
    }
  }, [refreshFn]);

  return { refreshing, onRefresh };
};

export default useRefresh;
