import { Switch } from 'antd';
import React, { useEffect, useState } from 'react';
import { NETWORK_DARK_THEME, NETWORK_LIGHT_THEME, SKIN_THEME, THEME } from '../config';
import { NetworkType } from '../model';
import { readStorage, updateStorage } from '../utils/helper/storage';

export const toggleTheme = (theme: THEME, network: NetworkType) => {
  const networkTheme = theme === THEME.DARK ? NETWORK_DARK_THEME : NETWORK_LIGHT_THEME;

  if (document && document.documentElement) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  window.less
    .modifyVars({
      ...SKIN_THEME[theme],
      ...SKIN_THEME.vars,
      ...networkTheme[network],
    })
    .then(() => {
      updateStorage({ theme });
      // Do not read theme from localStorage other than this file. Use readStorage instead.
      localStorage.setItem('theme', theme);
    });
};

export interface ThemeSwitchProps {
  network: NetworkType;
}

export function ThemeSwitch({ network }: ThemeSwitchProps) {
  const [theme, setTheme] = useState<THEME>(readStorage()?.theme || THEME.LIGHT);

  useEffect(() => {
    toggleTheme(theme, network);

    if (theme === THEME.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [network, theme]);

  return (
    <Switch
      checked={theme === THEME.DARK}
      checkedChildren="🌙"
      unCheckedChildren="☀️"
      onChange={() => {
        setTheme(theme === THEME.DARK ? THEME.LIGHT : THEME.DARK);
      }}
      className="ml-2 md:ml-4"
    />
  );
}
