import React, { createContext, useContext, useState, useEffect } from 'react';

interface HighContrastContextType {
  isHighContrast: boolean;
  toggleHighContrast: () => void;
  setHighContrast: (value: boolean) => void;
}

const HighContrastContext = createContext<HighContrastContextType>({
  isHighContrast: false,
  toggleHighContrast: () => {},
  setHighContrast: () => {},
});

export const useHighContrast = () => useContext(HighContrastContext);

interface HighContrastProviderProps {
  children: React.ReactNode;
}

export const HighContrastProvider: React.FC<HighContrastProviderProps> = ({ children }) => {
  const [isHighContrast, setIsHighContrast] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('codesync_high_contrast');
    if (saved !== null) {
      return saved === 'true';
    }
    // Check system preference
    return window.matchMedia?.('(prefers-contrast: more)').matches || false;
  });

  useEffect(() => {
    localStorage.setItem('codesync_high_contrast', String(isHighContrast));
    if (isHighContrast) {
      document.documentElement.classList.add('high-contrast');
      document.body.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
      document.body.classList.remove('high-contrast');
    }
  }, [isHighContrast]);

  const toggleHighContrast = () => setIsHighContrast((prev) => !prev);
  const setHighContrast = (val: boolean) => setIsHighContrast(val);

  return (
    <HighContrastContext.Provider
      value={{
        isHighContrast,
        toggleHighContrast,
        setHighContrast,
      }}
    >
      {children}
    </HighContrastContext.Provider>
  );
};
