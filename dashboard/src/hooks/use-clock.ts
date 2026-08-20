'use client';

import { useEffect, useState } from 'react';

export const useClock = () => {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());

    update();

    const timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, []);

  return now;
};