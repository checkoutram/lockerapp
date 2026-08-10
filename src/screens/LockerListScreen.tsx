import { useState, useEffect } from 'react';

import type { Locker } from '../types';
import {
  getItems,
  getLockers,
  runV3Migration,
  setAppVersion,
  getAppVersion,
} from '../utils/storage';

import { SafeArea } from 'capacitor-plugin-safe-area';
import { LocalNotifications } from '@capacitor/local-notifications';

import { useApp } from '../context/AppContext';

import {
  Building2,
  ChevronRight,
  Plus,
  Settings,
  Shield,
  Lock,
} from 'lucide-react';

import { APP_NAME } from '../types';

const APP_VERSION = '3.0.0';

export default function LockerListScreen() {
  const { navigate, lockers, setLockers, items, setItems } = useApp();
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [topInset, setTopInset] = useState(0);
  const [bottomInset, setBottomInset] = useState(0);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  useEffect(() => {
    SafeArea.getSafeAreaInsets().then(({ insets }: any) => {
      setTopInset(insets.top);
      setBottomInset(insets.bottom);
    });
    initData();
  }, []);

  const initData = async () => {
    setIsLoading(true);

    await runV3Migration();

    const loadedLockers = await getLockers();
    const loadedItems = await getItems();

    setLockers(loadedLockers);
    setItems(loadedItems);

    await checkVersionUpdate();

    setIsLoading(false);
  };

  const checkVersionUpdate = async () => {
    const lastVersion = await getAppVersion();

    if (lastVersion && lastVersion !== APP_VERSION) {
      setShowWhatsNew(true);
      try {
        await LocalNotifications.schedule({
          notifications: [{
            id: 1,
            title: 'vLocker Updated!',
            body: 'Multi-locker support is here. Organize items across multiple lockers now!',
            schedule: { at: new Date(Date.now() + 1000) },
          }],
        });
      } catch (e) {
        // Local notifications may not be available on web
      }
    }

    await setAppVersion(APP_VERSION);
  };

  const getItemCountForLocker = (lockerId: string) => {
    return items.filter((item) => item.lockerId === lockerId).length;
  };

  const getInLockerCount = (lockerId: string) => {
    return items.filter((item) => item.lockerId === lockerId && item.inLocker).length;
  };

  const handleLockerClick = (locker: Locker) => {
    navigate('lockerDetail', { lockerId: locker.id });
  };

  const handleAddLocker = () => {
    navigate('manageLockers');
  };

  const filteredLockers = lockers.filter(
    (locker) =>
      locker.name.toLowerCase().includes(search.toLowerCase()) ||
      (locker.bankName && locker.bankName.toLowerCase().includes(search.toLowerCase()))
  );

  const totalItems = items.length;
  const totalInLocker = items.filter((i) => i.inLocker).length;

  return (
    <div className="h-full flex flex-col bg-[#0A1628] relative">
      <div style={{ height: topInset }} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#C9A84C]/30">
            <img src="/vlocker-icon.png" alt={APP_NAME} className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-base font-bold text-[#C9A84C] block" style={{ fontFamily: "'Playfair Display', serif" }}>
              {APP_NAME}
            </span>
            <span className="text-[9px] text-[#C9A84C]/50 tracking-wide">Know What Your Locker Holds.</span>
          </div>
        </div>
        <button onClick={() => navigate('settings')} aria-label="Settings"
          className="w-10 h-10 rounded-xl bg-[#111D2E] border border-[#1A3A5C] flex items-center justify-center active:scale-95 transition-transform"
        >
          <Settings className="w-5 h-5 text-[#8A94A6]" />
        </button>
      </div>

      {/* Search */}
      <div className="mx-5 mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search lockers..."
          className="w-full px-4 py-2.5 bg-[#111D2E] border border-[#1A3A5C] text-white placeholder-[#8A94A6]/60 rounded-xl focus:border-[#C9A84C]/50 focus:outline-none text-sm"
        />
      </div>

      {/* Stats Summary Card */}
      <div className="mx-5 mb-4 p-4 rounded-2xl card-vault">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-[#8A94A6] uppercase tracking-wider">Items in Locker</p>
            <p className="text-3xl font-bold text-white mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
              {totalInLocker}
            </p>
            {totalItems > totalInLocker && (
              <p className="text-[10px] text-amber-400/70 mt-1">{totalItems - totalInLocker} out of locker</p>
            )}
          </div>
          <div className="flex gap-3">
            <div className="text-right">
              <p className="text-xs text-[#8A94A6]">Total Items</p>
              <p className="text-lg font-bold text-[#C9A84C]" style={{ fontFamily: "'Playfair Display', serif" }}>
                {totalItems}
              </p>
            </div>
            <div className="w-px bg-[#1A3A5C]" />
            <div className="text-right">
              <p className="text-xs text-[#8A94A6]">Lockers</p>
              <p className="text-lg font-bold text-[#C9A84C]" style={{ fontFamily: "'Playfair Display', serif" }}>
                {lockers.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Whats New Banner */}
      {showWhatsNew && (
        <div className="mx-5 mb-3 bg-[#111D2E] border border-[#C9A84C]/30 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#C9A84C]/10 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-[#C9A84C]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium">New: Multi-Locker Support</p>
            <p className="text-[#8A94A6] text-xs mt-0.5">Organize items across multiple lockers</p>
          </div>
          <button
            onClick={() => setShowWhatsNew(false)}
            className="text-[#C9A84C] text-xs font-medium px-2 py-1 rounded-lg hover:bg-[#C9A84C]/10 transition-colors"
          >
            Got it
          </button>
        </div>
      )}

      {/* Locker Grid */}
      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-[#111D2E] border border-[#1A3A5C] h-24 animate-pulse" />
            ))}
          </div>
        ) : filteredLockers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <div className="w-32 h-32 rounded-full bg-[#111D2E] border border-[#1A3A5C] flex items-center justify-center mb-6 relative">
              <Lock className="w-14 h-14 text-[#8A94A6]/40" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#0A1628] border border-[#1A3A5C] flex items-center justify-center">
                <Building2 className="w-4 h-4 text-[#8A94A6]/40" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              No Lockers Yet
            </h3>
            <p className="text-sm text-[#8A94A6] text-center max-w-[240px]">
              Tap the + button to add your first locker to {APP_NAME}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredLockers.map((locker, index) => {
              const itemCount = getItemCountForLocker(locker.id);
              const inLocker = getInLockerCount(locker.id);

              return (
                <button
                  key={locker.id}
                  onClick={() => handleLockerClick(locker)}
                  aria-label={`Locker ${locker.name}`}
                  className="w-full text-left rounded-2xl card-vault overflow-hidden active:scale-[0.98] transition-transform cursor-pointer animate-slide-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center flex-shrink-0 border border-[#C9A84C]/20">
                        <Building2 className="w-6 h-6 text-[#C9A84C]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{locker.name}</h3>
                        {locker.bankName && (
                          <p className="text-[#8A94A6] text-xs mt-0.5 truncate">{locker.bankName}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-[#8A94A6]">{itemCount} items</span>
                          <span className="text-[#1A3A5C]">|</span>
                          <span className="text-xs text-[#10B981] font-medium">{inLocker} in locker</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#8A94A6]/40 flex-shrink-0" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Add Locker Button */}
      <div className="fixed bottom-6 right-6 z-50" style={{ bottom: `calc(1.5rem + ${bottomInset}px)` }}>
        <button
          onClick={handleAddLocker}
          aria-label="Add Locker"
          className="w-14 h-14 rounded-full bg-[#C9A84C] text-[#0A1628] flex items-center justify-center shadow-lg shadow-[#C9A84C]/20 hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" strokeWidth={2.5} />
        </button>
      </div>

      <div style={{ height: bottomInset }} />
    </div>
  );
}
