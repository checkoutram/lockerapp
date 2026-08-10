import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ScreenName, Locker, LockerItem, AppAlert } from '@/types';
import { SecureStore, setSessionActive, AsyncStorage } from '@/utils/storage';

interface AppContextType {
  // Navigation & auth (original)
  screen: ScreenName;
  prevScreen: ScreenName | null;
  selectedItemId: string | null;
  isAuthenticated: boolean;
  hasPin: boolean;
  navigate: (screen: ScreenName, data?: any) => void;
  goBack: () => void;
  setAuthenticated: (val: boolean) => void;
  checkPinExists: () => Promise<void>;
  logout: () => Promise<void>;

  // Multi-locker data (new)
  lockers: Locker[];
  setLockers: React.Dispatch<React.SetStateAction<Locker[]>>;
  items: LockerItem[];
  setItems: React.Dispatch<React.SetStateAction<LockerItem[]>>;
  selectedLockerId: string | null;
  setSelectedLockerId: React.Dispatch<React.SetStateAction<string | null>>;
  screenData: any;

  // Alerts (new)
  alerts: AppAlert[];
  showAlert: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissAlert: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<ScreenName>('splash');
  const [prevScreen, setPrevScreen] = useState<ScreenName | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New state
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [items, setItems] = useState<LockerItem[]>([]);
  const [selectedLockerId, setSelectedLockerId] = useState<string | null>(null);
  const [screenData, setScreenData] = useState<any>(null);
  const [alerts, setAlerts] = useState<AppAlert[]>([]);

  const checkPinExists = useCallback(async () => {
    const pin = await SecureStore.getItemAsync('pin');
    setHasPin(!!pin);
  }, []);

  useEffect(() => {
    const init = async () => {
      await checkPinExists();
      setIsAuthenticated(false);
    };
    init();
  }, [checkPinExists]);

  const refreshSession = useCallback(async () => {
    await setSessionActive(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const resetTimer = () => {
      refreshSession();
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current);
      }
      sessionTimerRef.current = setTimeout(async () => {
        setIsAuthenticated(false);
        setScreen('auth');
      }, 5 * 60 * 1000);
    };

    resetTimer();
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('click', resetTimer);

    return () => {
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [isAuthenticated, refreshSession]);

  const navigate = useCallback((newScreen: ScreenName, data?: any) => {
    setPrevScreen(screen);
    setScreen(newScreen);
    if (data !== undefined) {
      if (typeof data === 'string') {
        setSelectedItemId(data);
      } else if (typeof data === 'object' && data !== null) {
        setScreenData(data);
        if (data.itemId) setSelectedItemId(data.itemId);
        if (data.lockerId) setSelectedLockerId(data.lockerId);
      }
    }
  }, [screen]);

  const goBack = useCallback(() => {
    if (prevScreen) {
      setScreen(prevScreen);
      setPrevScreen(null);
    } else {
      setScreen('lockerList');
    }
  }, [prevScreen]);

  const setAuthenticated = useCallback((val: boolean) => {
    setIsAuthenticated(val);
  }, []);

  const logout = useCallback(async () => {
    setIsAuthenticated(false);
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    await AsyncStorage.setItem('just_logged_out', 'true');
    setScreen('auth');
  }, []);

  const showAlert = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 5);
    setAlerts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }, 3000);
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
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
        logout,
        lockers,
        setLockers,
        items,
        setItems,
        selectedLockerId,
        setSelectedLockerId,
        screenData,
        alerts,
        showAlert,
        dismissAlert,
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
