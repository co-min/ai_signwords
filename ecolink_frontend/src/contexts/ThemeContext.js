import React, { createContext, useState } from 'react';
import colors from '../colors';

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState({
    fontSize: 18,
    textColor: colors.text,
    backgroundColor: colors.background,
  });

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}