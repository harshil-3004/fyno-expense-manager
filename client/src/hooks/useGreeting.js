import { useState, useEffect } from 'react';
import { getGreeting, isEvening } from '../utils/greeting';

/**
 * Hook that returns time-appropriate greeting and evening status.
 * Refreshes every minute.
 */
const useGreeting = () => {
  const [greeting, setGreeting] = useState(getGreeting());
  const [evening, setEvening] = useState(isEvening());

  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getGreeting());
      setEvening(isEvening());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return { greeting, isEvening: evening };
};

export default useGreeting;
