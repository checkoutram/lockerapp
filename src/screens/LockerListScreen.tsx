import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Menu, ChevronRight, Plus, Shield, Lock, Landmark, MapPin, Package, Trash2, Edit3, Building2
} from 'lucide-react';
import { getAppVersion, setAppVersion, deleteLocker as storageDeleteLocker, setItems as storageSetItems, getLockers } from '../utils/storage';
import type { Locker } from '../types';
import { APP_VERSION } from '../utils/version';
import { MenuDrawer } from './MenuDrawer';
import { AddLockerSheet } from './AddLockerSheet';

export default function LockerListScreen() {
  const { navigate, lockers, items, refreshData, dataLoaded, setItems, setLockers, showAlert } = useApp();
  const [isLoading, setIsLoading] = useState(!dataLoaded);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ locker: Locker; x: number; y: number } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      if (!dataLoaded) {
        setIsLoading(true);
        await refreshData();
      }
      const lastVersion = await getAppVersion();
      if (lastVersion && lastVersion !== APP_VERSION) {
        // Version changed - user updated
      }
      await setAppVersion(APP_VERSION);
      setIsLoading(false);
    })();
  }, [refreshData, dataLoaded]);

  const handleLockerClick = (locker: Locker) => {
    navigate('lockerDetail', { lockerId: locker.id });
  };

  const handleLockerLongPress = (e: React.MouseEvent | React.TouchEvent, locker: Locker) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0]?.clientX || 0 : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY || 0 : e.clientY;
    setContextMenu({ locker, x: clientX, y: clientY });
  };

  const handleDeleteLocker = async (lockerId: string) => {
    const allLockers = await getLockers();
    if (allLockers.length <= 1) {
      showAlert('Cannot delete the last locker. At least one locker is required.', 'error');
      setShowDeleteConfirm(null);
      setContextMenu(null);
      return;
    }

    const itemsInLocker = items.filter((i) => i.lockerId === lockerId);
    if (itemsInLocker.length > 0) {
      const remainingLockers = lockers.filter((l) => l.id !== lockerId);
      const fallbackId = remainingLockers[0]?.id || '';
      const updatedItems = items.map((i) =>
        i.lockerId === lockerId ? { ...i, lockerId: fallbackId } : i
      );
      await storageSetItems(updatedItems);
      setItems(updatedItems);
    }

    await storageDeleteLocker(lockerId);
    const updated = await getLockers();
    setLockers(updated);
    setShowDeleteConfirm(null);
    setContextMenu(null);
    showAlert('Locker deleted', 'success');
  };

  const getItemCountForLocker = (lockerId: string) => {
    return items.filter(item => item.lockerId === lockerId).length;
  };

  if (isLoading) {
    return (
      <div className="h-full w-full bg-[#050A12] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D6B45C]/20 border-t-[#D6B45C] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#050A12] flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button
          onClick={() => setMenuOpen(true)}
          className="p-2 -ml-2 rounded-full active:bg-white/5"
          aria-label="Menu"
        >
          <Menu className="w-6 h-6 text-[#D6B45C]" />
        </button>

        {/* Center brand */}
        <div className="flex flex-col items-center">
          <img
            src="/vlocker-icon.png"
            alt="Vlocker"
            className="w-10 h-10 object-contain"
          />
          <span className="text-sm font-bold text-[#D6B45C] tracking-wide mt-0.5">VLocker</span>
        </div>

        {/* Count badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#D6B45C]/30 bg-[#D6B45C]/5">
          <Package className="w-4 h-4 text-[#D6B45C]" />
          <span className="text-sm font-semibold text-[#D6B45C]">{lockers.length}</span>
        </div>
      </div>

      {/* Title Section */}
      <div className="px-5 pt-2 pb-4">
        <h1 className="text-2xl font-bold text-[#F7F5EF]">My Lockers</h1>
        <p className="text-sm text-[#A6B2C2]/70 mt-1">Manage and access your bank lockers</p>
      </div>

      {/* Locker List */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3">
        {lockers.map((locker) => (
          <button
            key={locker.id}
            onClick={() => handleLockerClick(locker)}
            onContextMenu={(e) => handleLockerLongPress(e, locker)}
            onTouchStart={(e) => {
              const timer = setTimeout(() => handleLockerLongPress(e, locker), 600);
              const clear = () => clearTimeout(timer);
              e.currentTarget.addEventListener('touchend', clear, { once: true });
              e.currentTarget.addEventListener('touchmove', clear, { once: true });
            }}
            className="w-full text-left bg-[#0B1525] rounded-2xl p-4 border border-[#1D344D]/40 flex items-center gap-4 active:scale-[0.98] transition-transform"
          >
            {/* Locker Icon */}
            <div className="w-14 h-14 rounded-xl bg-[#D6B45C]/10 flex items-center justify-center flex-shrink-0">
              <img
                src="/locker-safe-icon.png"
                alt=""
                className="w-10 h-10 object-contain"
              />
            </div>

            {/* Locker Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-[#F7F5EF]">{locker.name}</h3>
              {locker.bankName || locker.branch ? (
                <div className="mt-1 space-y-0.5">
                  {locker.bankName && (
                    <div className="flex items-center gap-1.5 text-xs text-[#A6B2C2]/70">
                      <Landmark className="w-3 h-3 text-[#D6B45C]/70" />
                      <span className="truncate">{locker.bankName}</span>
                    </div>
                  )}
                  {locker.branch && (
                    <div className="flex items-center gap-1.5 text-xs text-[#A6B2C2]/70">
                      <MapPin className="w-3 h-3 text-[#D6B45C]/70" />
                      <span className="truncate">{locker.branch}{locker.location ? `, ${locker.location}` : ''}</span>
                    </div>
                  )}
                  {!locker.branch && locker.location && (
                    <div className="flex items-center gap-1.5 text-xs text-[#A6B2C2]/70">
                      <MapPin className="w-3 h-3 text-[#D6B45C]/70" />
                      <span className="truncate">{locker.location}</span>
                    </div>
                  )}
                </div>
              ) : locker.location ? (
                <div className="mt-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs text-[#A6B2C2]/70">
                    <MapPin className="w-3 h-3 text-[#D6B45C]/70" />
                    <span className="truncate">{locker.location}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#A6B2C2]/50 mt-1">Add your locker details</p>
              )}
            </div>

            {/* Right Action */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#D6B45C]/30 bg-[#D6B45C]/5">
                <Package className="w-3.5 h-3.5 text-[#D6B45C]" />
                <span className="text-xs font-medium text-[#D6B45C]">{getItemCountForLocker(locker.id)} Items</span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#D6B45C]/60" />
            </div>
          </button>
        ))}

        {/* Add New Locker Card */}
        <button
          onClick={() => setAddSheetOpen(true)}
          className="w-full text-left bg-[#0B1525]/50 rounded-2xl p-4 border border-dashed border-[#1D344D]/40 flex items-center gap-4 active:scale-[0.98] transition-transform"
        >
          <div className="w-14 h-14 rounded-xl bg-[#D6B45C]/5 border border-[#D6B45C]/20 flex items-center justify-center flex-shrink-0">
            <Plus className="w-6 h-6 text-[#D6B45C]/60" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#A6B2C2]/70">Add New Locker</h3>
            <p className="text-sm text-[#A6B2C2]/40 mt-0.5">Create a new locker to store items</p>
          </div>
        </button>

        {/* Spacer for footer */}
        <div className="h-4" />
      </div>

      {/* Security Footer */}
      <div className="px-5 pb-5">
        <div className="bg-[#0B1525] rounded-2xl p-4 border border-[#1D344D]/40 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#D6B45C]/10 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-[#D6B45C]" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-[#F7F5EF]">Secure & Private</h4>
            <p className="text-xs text-[#A6B2C2]/60 mt-0.5">Your data never leaves your device</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Lock className="w-4 h-4 text-[#5ED6A5]" />
            <span className="text-xs font-medium text-[#5ED6A5]">100% Safe</span>
          </div>
        </div>
      </div>

      {/* Menu Drawer */}
      {menuOpen && <MenuDrawer onClose={() => setMenuOpen(false)} />}

      {/* Add Locker Sheet */}
      {addSheetOpen && (
        <AddLockerSheet
          onClose={() => setAddSheetOpen(false)}
          onSaved={() => { setAddSheetOpen(false); refreshData(); }}
        />
      )}

      {/* Locker Context Menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-[60]"
          onClick={() => setContextMenu(null)}
        >
          <div
            className="absolute bg-[#101F32] rounded-xl border border-[#1D344D] shadow-xl py-1 min-w-[180px]"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 200),
              top: Math.min(contextMenu.y, window.innerHeight - 120),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setContextMenu(null);
                navigate('lockerDetail', { lockerId: contextMenu.locker.id });
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-[#F7F5EF] hover:bg-[#1D344D]"
            >
              <Building2 className="w-4 h-4 text-[#D6B45C]" />
              View Items
            </button>
            <button
              onClick={() => {
                setContextMenu(null);
                navigate('manageLockers');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-[#F7F5EF] hover:bg-[#1D344D]"
            >
              <Edit3 className="w-4 h-4 text-[#A6B2C2]" />
              Rename
            </button>
            <div className="border-t border-[#1D344D] my-1" />
            <button
              onClick={() => {
                setShowDeleteConfirm(contextMenu.locker.id);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-[#E98B8B] hover:bg-[#3A2427]"
            >
              <Trash2 className="w-4 h-4" />
              Delete Locker
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-6">
          <div className="bg-[#101F32] rounded-2xl p-6 w-full max-w-sm border border-[#1D344D]/50">
            <h3 className="text-lg font-bold text-[#F7F5EF] mb-2">Delete Locker?</h3>
            <p className="text-sm text-[#A6B2C2] mb-6">
              Items in this locker will be moved to the default locker. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl bg-[#14263B] text-[#F7F5EF] font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteLocker(showDeleteConfirm)}
                className="flex-1 py-3 rounded-xl bg-[#E98B8B]/20 text-[#E98B8B] font-medium text-sm border border-[#E98B8B]/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
