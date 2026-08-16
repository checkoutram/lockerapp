import { useState, useEffect, useCallback } from 'react';
import {
  Lock, Plus, Settings, Archive, CheckCircle2, AlertCircle, Shield,
  ChevronRight, Gem, FileText, Smartphone, Package,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getItems, getLockers } from '@/utils/storage';
import type { Locker, LockerItem } from '@/types';
import { APP_NAME } from '@/types';

type Toast = { id: number; message: string; type: 'success' | 'error' };

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Jewellery: <Gem className="w-5 h-5" />,
  Document: <FileText className="w-5 h-5" />,
  Electronics: <Smartphone className="w-5 h-5" />,
  Other: <Package className="w-5 h-5" />,
};

export default function HomeScreen() {
  const { navigate } = useApp();
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [items, setItems] = useState<LockerItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const loadData = useCallback(async () => {
    const [lockerData, itemData] = await Promise.all([getLockers(), getItems()]);
    setLockers(lockerData);
    setItems(itemData);
    setLoaded(true);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const inLockerItems = items.filter((i) => i.inLocker !== false);
  const outOfLockerItems = items.filter((i) => i.inLocker === false);

  const getLockerItemCount = (lockerId: string) =>
    items.filter((i) => i.lockerId === lockerId).length;
  const getLockerInCount = (lockerId: string) =>
    items.filter((i) => i.lockerId === lockerId && i.inLocker !== false).length;
  const getLockerOutCount = (lockerId: string) =>
    items.filter((i) => i.lockerId === lockerId && i.inLocker === false).length;

  const getLockerPreviewItems = (lockerId: string) =>
    items.filter((i) => i.lockerId === lockerId).slice(0, 3);

  return (
    <div className="h-full flex flex-col bg-[#081321] relative">
      {/* Toast Notifications */}
      <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
        {toasts.map((toast) => (
          <div key={toast.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg pointer-events-auto animate-fade-in max-w-[90%] ${
              toast.type === 'success' ? 'bg-[#36B37E] text-[#F7F5EF]' : 'bg-[#D66A6A] text-[#F7F5EF]'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span className="truncate">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header - safe-area aware for edge-to-edge */}
      <div className="flex items-center justify-between px-4 pb-3" style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top, 0px))" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#D6B45C]/30">
            <img src="/vlocker-icon.png" alt={APP_NAME} className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-base font-bold text-[#D6B45C] block">{APP_NAME}</span>
            <span className="text-[9px] text-[#D6B45C]/50 tracking-wide">Know what&apos;s inside your locker</span>
          </div>
        </div>
        <button onClick={() => navigate('settings')} aria-label="Settings"
          className="w-10 h-10 rounded-xl bg-[#101F32] border border-[#1D344D] flex items-center justify-center active:scale-95 transition-transform"
        >
          <Settings className="w-5 h-5 text-[#A6B2C2]" />
        </button>
      </div>

      {/* Summary Card */}
      <div className="mx-5 mb-4 p-4 rounded-2xl card-vault">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#A6B2C2] uppercase tracking-wider">Items in Locker</p>
            <p className="text-3xl font-bold text-[#F7F5EF] mt-1">{inLockerItems.length}</p>
            {outOfLockerItems.length > 0 && (
              <p className="text-[10px] text-amber-400/70 mt-1">{outOfLockerItems.length} out of locker</p>
            )}
          </div>
          <div className="w-14 h-14 rounded-2xl bg-[#D6B45C]/10 flex items-center justify-center overflow-hidden">
            <img src="/vlocker-icon.png" alt={APP_NAME} className="w-12 h-12 object-contain" />
          </div>
        </div>
      </div>

      {/* Lockers List */}
      <div className="flex-1 overflow-y-auto px-5" style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}>
        {!loaded ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-[#101F32] border border-[#1D344D] h-24 animate-pulse" />
            ))}
          </div>
        ) : lockers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <div className="w-24 h-24 rounded-full bg-[#101F32] border border-[#1D344D] flex items-center justify-center mb-5">
              <Lock className="w-10 h-10 text-[#A6B2C2]/40" />
            </div>
            <h3 className="text-xl font-bold text-[#F7F5EF] mb-2">No Lockers Yet</h3>
            <p className="text-sm text-[#A6B2C2] text-center max-w-[240px]">
              Tap + to create your first locker and start adding items.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {lockers.map((locker) => {
              const total = getLockerItemCount(locker.id);
              const inCount = getLockerInCount(locker.id);
              const outCount = getLockerOutCount(locker.id);
              const previewItems = getLockerPreviewItems(locker.id);

              return (
                <button key={locker.id}
                  onClick={() => navigate('lockerDetail', { lockerId: locker.id })}
                  className="w-full text-left rounded-2xl card-vault p-4 active:scale-[0.98] transition-transform animate-slide-in"
                >
                  <div className="flex items-center gap-3">
                    {/* Locker Icon */}
                    <div className="w-12 h-12 rounded-xl bg-[#D6B45C]/10 flex items-center justify-center shrink-0">
                      <Archive className="w-6 h-6 text-[#D6B45C]" />
                    </div>

                    {/* Locker Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-[#F7F5EF] truncate">{locker.name}</h3>
                        {outCount > 0 && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">
                            {outCount} out
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-[#A6B2C2]">{total} items</span>
                        <span className="text-xs text-[#5ED6A5]">{inCount} in</span>
                        {outCount > 0 && <span className="text-xs text-amber-400/70">{outCount} out</span>}
                      </div>
                    </div>

                    {/* Preview dots */}
                    {previewItems.length > 0 && (
                      <div className="flex -space-x-2 shrink-0">
                        {previewItems.map((item) => (
                          <div key={item.id}
                            className="w-8 h-8 rounded-full bg-[#101F32] border border-[#1D344D] flex items-center justify-center"
                            title={item.name}
                          >
                            {CATEGORY_ICONS[item.category] || CATEGORY_ICONS.Other}
                          </div>
                        ))}
                      </div>
                    )}

                    <ChevronRight className="w-5 h-5 text-[#667487] shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB — Add Item (goes to locker list for selection, or default locker) */}
      <button
        onClick={() => {
          if (lockers.length === 1) {
            navigate('addItem', { preselectedLockerId: lockers[0].id, editItem: null });
          } else if (lockers.length > 1) {
            navigate('lockerList', { selectForAdd: true });
          } else {
            addToast('Create a locker first', 'error');
            navigate('manageLockers');
          }
        }}
        aria-label="Add Item"
        className="absolute right-5 w-14 h-14 rounded-full bg-[#D6B45C] flex items-center justify-center shadow-lg active:scale-95 transition-transform z-10 animate-pulse-gold" style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <Plus className="w-6 h-6 text-[#081321]" strokeWidth={2.5} />
      </button>

      {/* Privacy Note */}
      <div className="shrink-0 flex items-center justify-center gap-1.5 text-[10px] text-[#5ED6A5]/70 bg-emerald-500/5 px-4 py-2 border-t border-[#36B37E]">
        <Shield className="w-3 h-3 flex-shrink-0" />
        <span>Your data stays on your device - private and secure</span>
      </div>
    </div>
  );
}
