'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { subDays } from 'date-fns';

interface SettingsContextType {
  analysisStartDate: Date;
  setAnalysisStartDate: (date: Date) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [analysisStartDate, setAnalysisStartDate] = useState<Date>(() => {
    // Try to load from localStorage on init
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('analysisStartDate');
      if (saved) return new Date(saved);
    }
    return subDays(new Date(), 30);
  });

  useEffect(() => {
    localStorage.setItem('analysisStartDate', analysisStartDate.toISOString());
  }, [analysisStartDate]);

  return (
    <SettingsContext.Provider value={{ analysisStartDate, setAnalysisStartDate }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
