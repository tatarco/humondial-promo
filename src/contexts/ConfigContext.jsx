import { createContext, useContext } from 'react';

const ConfigContext = createContext(null);

export function ConfigProvider({ config, children }) {
  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}
