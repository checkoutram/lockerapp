import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft, Building2, CheckCircle2, AlertCircle, ChevronRight, Edit3, Grid3X3, List, Lock, MapPin, Plus, Search, SlidersHorizontal, Unlock, X
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getItems, getLockers, updateLocker, updateItem } from '@/utils/storage';
import PhotoImage from '@/components/PhotoImage';
import type { Locker, LockerItem } from '@/types';
import { Capacitor } from '@capacitor/core';

// @ts-ignore - capacitor-plugin-safe-area may not have types
declare module 'capacitor-plugin-safe-area';
import { SafeArea } from 'capacitor-plugin-safe-area';

type Toast = { id: number; message: string; type: 'success' | 'error' };

export default function LockerDetailScreen() {
  const { goBack, navigate, screenData, setItems: setContextItems } = useApp();
  const lockerId = screenData?.lockerId || 'default';

  const [locker, setLocker] = useState<Locker | null>(null);
  const [items, setItems] = useState<LockerItem[]>([]);
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'inLocker' | 'atHome'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'category'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: LockerItem } | null>(null);
  const [showRename, setShowRename] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [renameBank, setRenameBank] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [topInset, setTopInset] = useState(0);
  const [bottomInset, setBottomInset] = useState(0);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    SafeArea.getSafeAreaInsets().then(({ insets }: any) => {
      setTopInset(insets.top);
      setBottomInset(insets.bottom);
    });
    loadData();
  }, [lockerId]);

  useEffect(() => {
    const l = lockers.find((lk) => lk.id === lockerId);
    if (l) setLocker(l);
  }, [lockers, lockerId]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterMenu(false);
      }
      if (contextMenu) setContextMenu(null);
    }
    function onTouch() {
      if (contextMenu) setContextMenu(null);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onTouch, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onTouch);
    };
  }, [contextMenu]);

  const loadData = useCallback(async () => {
    const loadedItems = await getItems();
    const loadedLockers = await getLockers();
    setItems(loadedItems);
    setLockers(loadedLockers);
    setContextItems(loadedItems);
  }, [lockerId, setContextItems]);

  const lockerItems = items.filter((item) => item.lockerId === lockerId);

  const filteredItems = lockerItems
    .filter((item) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.subType.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    })
    .filter((item) => {
      if (filterStatus === 'inLocker') return item.inLocker;
      if (filterStatus === 'atHome') return !item.inLocker;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'category') return a.category.localeCompare(b.category);
      return 0;
    });

  const inLockerCount = lockerItems.filter((i) => i.inLocker).length;
  const atHomeCount = lockerItems.length - inLockerCount;

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, item: LockerItem) => {
    e.preventDefault();
    const isMobile = Capacitor.isNativePlatform() || window.innerWidth < 768;
    const x = isMobile ? window.innerWidth / 2 - 120 : e.clientX;
    const y = isMobile ? e.clientY - 80 : e.clientY;
    setContextMenu({ x, y, item });
  };

  const handleEditItem = (item: LockerItem) => {
    setContextMenu(null);
    navigate('itemDetail', item.id);
  };

  const handleMoveItem = async (item: LockerItem, newLockerId: string) => {
    const updated = { ...item, lockerId: newLockerId };
    const result = await updateItem(updated);
    if (result.success) {
      const updatedItems = await getItems();
      setItems(updatedItems);
      setContextItems(updatedItems);
      addToast('Item moved to another locker', 'success');
    } else {
      addToast('Failed to move item', 'error');
    }
    setContextMenu(null);
  };

  const handleDeleteItem = async (item: LockerItem) => {
    const { deleteItem } = await import('@/utils/storage');
    await deleteItem(item.id);
    const updatedItems = await getItems();
    setItems(updatedItems);
    setContextItems(updatedItems);
    setContextMenu(null);
    addToast('Item deleted', 'success');
  };

  const handleToggleStatus = async (item: LockerItem) => {
    const updated = { ...item, inLocker: !item.inLocker };
    const result = await updateItem(updated);
    if (result.success) {
      const updatedItems = await getItems();
      setItems(updatedItems);
      setContextItems(updatedItems);
      addToast(!item.inLocker ? 'Marked as in locker' : 'Marked as at home', 'success');
    }
    setContextMenu(null);
  };

  const handleSaveRename = async () => {
    console.log('handleSaveRename called', { locker, renameName, renameBank });
    if (!locker) return;
    const updated = { ...locker, name: renameName.trim(), bankName: renameBank.trim() || undefined };
    console.log('updated locker', updated);
    await updateLocker(updated);
    console.log('updateLocker done');
    const updatedLockers = await getLockers();
    console.log('updatedLockers from storage', updatedLockers);
    setLockers(updatedLockers);
    setShowRename(false);
    addToast('Locker updated', 'success');
  };

  const handleAddItem = () => {
    navigate('addItem', { preselectedLockerId: lockerId, lockerId });
  };

  const availableOtherLockers = lockers.filter((l) => l.id !== lockerId);

  return (
    <div className="h-full flex flex-col bg-[#0A1628] relative">
      {/* Toast Notifications */}
      <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
        {toasts.map((toast) => (
          <div key={toast.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg pointer-events-auto animate-fade-in max-w-[90%] ${
              toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span className="truncate">{toast.message}</span>
          </div>
        ))}
      </div>

      <div style={{ height: topInset }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button
          onClick={goBack}
          aria-label="Back"
          className="p-2 -ml-2 rounded-full active:bg-white/5"
        >
          <ArrowLeft className="w-5 h-5 text-[#8A94A6]" />
        </button>
        <div className="text-center flex-1 px-2">
          <h1 className="text-white font-bold text-base truncate">
            {locker?.name || 'Locker'}
          </h1>
          {locker?.bankName && (
            <p className="text-[#8A94A6] text-xs">{locker.bankName}</p>
          )}
        </div>
        <button
          onClick={() => {
            setRenameName(locker?.name || '');
            setRenameBank(locker?.bankName || '');
            setShowRename(true);
          }}
          aria-label="Edit Locker"
          className="p-2 -mr-2 rounded-full active:bg-white/5"
        >
          <Edit3 className="w-5 h-5 text-[#8A94A6]" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A94A6]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items in this locker..."
            className="w-full pl-9 pr-4 py-2.5 bg-[#111D2E] border border-[#1A3A5C] text-white placeholder-[#8A94A6]/50 rounded-xl text-sm focus:border-[#C9A84C]/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Stats Tabs */}
      <div className="flex gap-2 px-4 pb-3">
        <button
          onClick={() => setFilterStatus('all')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            filterStatus === 'all' ? 'bg-[#C9A84C]/20 text-[#C9A84C] border border-[#C9A84C]/30' : 'bg-[#111D2E] text-[#8A94A6] border border-[#1A3A5C]'
          }`}
        >
          All ({lockerItems.length})
        </button>
        <button
          onClick={() => setFilterStatus('inLocker')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            filterStatus === 'inLocker' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#111D2E] text-[#8A94A6] border border-[#1A3A5C]'
          }`}
        >
          In Locker ({inLockerCount})
        </button>
        <button
          onClick={() => setFilterStatus('atHome')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            filterStatus === 'atHome' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-[#111D2E] text-[#8A94A6] border border-[#1A3A5C]'
          }`}
        >
          At Home ({atHomeCount})
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1A3A5C]/50">
        <p className="text-[#8A94A6] text-xs">
          {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-1">
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="p-2 rounded-lg hover:bg-[#1A3A5C]/50 text-[#8A94A6]"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-[#111D2E] rounded-xl shadow-lg border border-[#1A3A5C] z-50 overflow-hidden">
                <button
                  onClick={() => { setSortBy('date'); setShowFilterMenu(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm ${sortBy === 'date' ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'text-white hover:bg-[#1A3A5C]'}`}
                >
                  Sort by Date Added
                </button>
                <button
                  onClick={() => { setSortBy('name'); setShowFilterMenu(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm ${sortBy === 'name' ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'text-white hover:bg-[#1A3A5C]'}`}
                >
                  Sort by Name
                </button>
                <button
                  onClick={() => { setSortBy('category'); setShowFilterMenu(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm ${sortBy === 'category' ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'text-white hover:bg-[#1A3A5C]'}`}
                >
                  Sort by Category
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'text-[#8A94A6] hover:text-white'}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'text-[#8A94A6] hover:text-white'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-24">
        {lockerItems.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-[#8A94A6]/30 mx-auto mb-3" />
            <p className="text-[#8A94A6] text-sm">No items in this locker yet</p>
            <p className="text-[#8A94A6]/60 text-xs mt-1">Tap + to add your first item</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-10 h-10 text-[#8A94A6]/30 mx-auto mb-3" />
            <p className="text-[#8A94A6] text-sm">No items match your search</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate('itemDetail', item.id)}
                onContextMenu={(e) => handleContextMenu(e, item)}
                aria-label={`Item ${item.name}`}
                className="bg-[#111D2E] rounded-xl border border-[#1A3A5C] p-3 hover:border-[#C9A84C]/50 active:scale-[0.98] transition-all text-left"
              >
                <div className="w-full h-24 rounded-lg bg-[#0A1628] overflow-hidden mb-2">
                  {item.photos && item.photos.length > 0 ? (
                    <PhotoImage photoRef={item.photos[0]} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[#8A94A6]/40 text-xs">No photo</span>
                    </div>
                  )}
                </div>
                <p className="font-medium text-sm text-white truncate">{item.name}</p>
                <p className="text-xs text-[#8A94A6] mt-0.5">{item.category}</p>
                <div className="flex items-center gap-1 mt-1">
                  {item.inLocker ? (
                    <Lock className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Unlock className="w-3 h-3 text-amber-500" />
                  )}
                  <span className={`text-xs ${item.inLocker ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {item.inLocker ? 'In Locker' : 'At Home'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate('itemDetail', item.id)}
                onContextMenu={(e) => handleContextMenu(e, item)}
                aria-label={`Item ${item.name}`}
                className="w-full text-left bg-[#111D2E] rounded-xl border border-[#1A3A5C] p-3 hover:border-[#C9A84C]/50 active:scale-[0.98] transition-all flex items-center gap-3"
              >
                <div className="w-14 h-14 rounded-lg bg-[#0A1628] overflow-hidden flex-shrink-0">
                  {item.photos && item.photos.length > 0 ? (
                    <PhotoImage photoRef={item.photos[0]} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[#8A94A6]/40 text-xs">No photo</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-white truncate">{item.name}</p>
                  <p className="text-xs text-[#8A94A6] mt-0.5">{item.category} &middot; {item.subType}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {item.inLocker ? (
                      <Lock className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Unlock className="w-3 h-3 text-amber-500" />
                    )}
                    <span className={`text-xs ${item.inLocker ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {item.inLocker ? 'In Locker' : 'At Home'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8A94A6] flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <div className="fixed bottom-6 right-6 z-50" style={{ bottom: `calc(1.5rem + ${bottomInset}px)` }}>
        <button
          onClick={handleAddItem}
          aria-label="Add Item"
          className="w-14 h-14 bg-[#C9A84C] rounded-full shadow-lg flex items-center justify-center text-[#0A1628] hover:bg-[#C9A84C]/90 active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[#111D2E] rounded-xl shadow-lg border border-[#1A3A5C] py-1 w-44"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => handleEditItem(contextMenu.item)}
            className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-[#1A3A5C] flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" /> Edit
          </button>
          <button
            onClick={() => handleToggleStatus(contextMenu.item)}
            className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-[#1A3A5C] flex items-center gap-2"
          >
            {contextMenu.item.inLocker ? (
              <><Unlock className="w-4 h-4" /> Mark At Home</>
            ) : (
              <><Lock className="w-4 h-4" /> Mark In Locker</>
            )}
          </button>
          {availableOtherLockers.length > 0 && (
            <div className="relative group">
              <button className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-[#1A3A5C] flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Move to... <ChevronRight className="w-3 h-3 ml-auto rotate-90" />
              </button>
              <div className="hidden group-hover:block absolute left-full top-0 ml-1 w-40 bg-[#111D2E] rounded-xl shadow-lg border border-[#1A3A5C] py-1">
                {availableOtherLockers.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => handleMoveItem(contextMenu.item, l.id)}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[#1A3A5C] truncate"
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => handleDeleteItem(contextMenu.item)}
            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
          >
            <X className="w-4 h-4" /> Delete
          </button>
        </div>
      )}

      {/* Rename Locker Modal */}
      {showRename && locker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#111D2E] rounded-2xl w-full max-w-sm p-5 border border-[#1A3A5C]">
            <h2 className="text-lg font-bold text-white mb-1">Rename Locker</h2>
            <p className="text-[#8A94A6] text-sm mb-4">Update locker details</p>
            <label className="block text-sm text-[#8A94A6] mb-1">Locker Name</label>
            <input
              type="text"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#0A1628] border border-[#1A3A5C] text-white rounded-xl focus:border-[#C9A84C]/50 focus:outline-none text-sm mb-3"
              placeholder="e.g., Locker 1"
            />
            <label className="block text-sm text-[#8A94A6] mb-1">Bank Name</label>
            <input
              type="text"
              value={renameBank}
              onChange={(e) => setRenameBank(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#0A1628] border border-[#1A3A5C] text-white rounded-xl focus:border-[#C9A84C]/50 focus:outline-none text-sm mb-4"
              placeholder="e.g., HDFC Bank"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowRename(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#1A3A5C] text-[#8A94A6] font-medium text-sm hover:bg-[#1A3A5C]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRename}
                disabled={!renameName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#C9A84C] text-[#0A1628] font-medium text-sm hover:bg-[#C9A84C]/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: bottomInset }} />
    </div>
  );
}
