import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ScreenName } from '@/types';
import { SecureStore } from '@/utils/storage';

interface AppContextType {
  screen: ScreenName;
  prevScreen: ScreenName | null;
  selectedItemId: string | null;
  isAuthenticated: boolean;
  hasPin: boolean;
  navigate: (screen: ScreenName, itemId?: string) => void;
  goBack: () => void;
  setAuthenticated: (val: boolean) => void;
  checkPinExists: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<ScreenName>('splash');
  const [prevScreen, setPrevScreen] = useState<ScreenName | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('inbanklocker_authed') === 'true';
  });
  const [hasPin, setHasPin] = useState(false);

  const checkPinExists = useCallback(async () => {
    const pin = await SecureStore.getItemAsync('pin');
    setHasPin(!!pin);
  }, []);

  useEffect(() => {
    checkPinExists();
  }, [checkPinExists]);

  useEffect(() => {
    sessionStorage.setItem('inbanklocker_authed', isAuthenticated ? 'true' : 'false');
  }, [isAuthenticated]);

  const navigate = useCallback((newScreen: ScreenName, itemId?: string) => {
    setPrevScreen(screen);
    setScreen(newScreen);
    if (itemId !== undefined) {
      setSelectedItemId(itemId);
    }
  }, [screen]);

  const goBack = useCallback(() => {
    if (prevScreen) {
      setScreen(prevScreen);
      setPrevScreen(null);
    } else {
      setScreen('home');
    }
  }, [prevScreen]);

  const setAuthenticated = useCallback((val: boolean) => {
    setIsAuthenticated(val);
  }, []);

  return (
    <AppContext.Provider
      value={{
        screen,
        prevScreen,
        selectedItemId,
        isAuthenticated,
        hasPin,
        navigate,
        goBack,
        setAuthenticated,
        checkPinExists,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
