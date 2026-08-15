import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import {
  ChevronLeft, Search, Plus, Calendar, Trash2,
} from 'lucide-react';
import { getItems, getLockers, deleteItem } from '../utils/storage';
import PhotoImage from '../components/PhotoImage';
import type { LockerItem, Locker } from '../types';
import { CATEGORY_COLORS } from '../types';
import { MenuDrawer } from './MenuDrawer';

export default function LockerDetailScreen() {
  const { navigate, screenData, setItems: setContextItems, setLockers: setContextLockers } = useApp();

  // Capture lockerId once on mount so it survives screenData overwrites from child navigation
  const [currentLockerId] = useState<string | undefined>(screenData?.lockerId);
  const lockerId = currentLockerId;
  const [locker, setLocker] = useState<Locker | null>(null);
  const [items, setItems] = useState<LockerItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'in' | 'out'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contextItem, setContextItem] = useState<LockerItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    };
  }, []);

  const loadData = useCallback(async () => {
    const loadedItems = await getItems();
    const loadedLockers = await getLockers();
    setItems(loadedItems);
    setContextItems(loadedItems);
    setContextLockers(loadedLockers);
    const l = loadedLockers.find((l: Locker) => l.id === lockerId);
    if (l) setLocker(l);
    setIsLoading(false);
  }, [lockerId, setContextItems, setContextLockers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Items matching the search query for this locker
  const searchItems = items.filter((item) => {
    if (item.lockerId !== lockerId) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  // Tab-filtered items
  const filteredItems = searchItems.filter((item) => {
    if (activeTab === 'in' && !item.inLocker) return false;
    if (activeTab === 'out' && item.inLocker) return false;
    return true;
  });

  // Counts reflect the search filter
  const totalCount = searchItems.length;
  const inLockerCount = searchItems.filter((i) => i.inLocker).length;
  const outOfLockerCount = searchItems.filter((i) => !i.inLocker).length;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch { return ''; }
  };

  const getStatusColor = (inLocker: boolean) => {
    return inLocker
      ? 'bg-[#5ED6A5]/20 text-[#5ED6A5] border border-[#5ED6A5]/30'
      : 'bg-[#D6B45C]/20 text-[#D6B45C] border border-[#D6B45C]/30';
  };

  const getCategoryDot = (cat: string) => {
    return CATEGORY_COLORS[cat] || '#95A5A6';
  };

  const handleItemDelete = async () => {
    if (!contextItem) return;
    await deleteItem(contextItem.id);
    const updated = await getItems();
    setItems(updated);
    setContextItems(updated);
    setShowDeleteConfirm(false);
    setContextItem(null);
  };

  const handleLongPress = (item: LockerItem) => {
    setContextItem(item);
    setShowDeleteConfirm(true);
  };

  if (isLoading) {
    return (
      <div className="h-full w-full bg-[#050A12] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D6B45C]/20 border-t-[#D6B45C] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#050A12]">
      {/* Header */}
      <div className="shrink-0 px-4 pt-5 pb-3">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate('lockerList')} aria-label="Back" className="p-2 -ml-2 rounded-full active:bg-white/5">
            <ChevronLeft className="w-5 h-5 text-[#F7F5EF]" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#F7F5EF]">{locker?.name || 'Locker'}</h1>
            <p className="text-sm text-[#5ED6A5] font-semibold">{totalCount} Items</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 px-4 pb-3">
        <div className="flex rounded-xl overflow-hidden bg-[#0B1525] border border-[#1D344D]">
          {[
            { key: 'all', label: `All (${totalCount})` },
            { key: 'in', label: `In Locker (${inLockerCount})` },
            { key: 'out', label: `Out of Locker (${outOfLockerCount})` },
          ].map((tab) => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'text-[#5ED6A5] bg-[#1D344D]'
                  : 'text-[#A6B2C2]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="shrink-0 px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667487]" />
          <input type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items by name, category, etc."
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#0B1525] border border-[#1D344D] text-[#F7F5EF] placeholder-[#667487]/50 text-sm focus:border-[#D6B45C]/50 transition-colors outline-none"
          />
        </div>
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-28">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#A6B2C2]/40 py-12">
            <Search className="w-12 h-12 mb-4" />
            <p className="text-sm">
              {searchQuery.trim() ? `No matches for "${searchQuery}"` : 'No items found'}
            </p>
            <p className="text-xs mt-1">
              {searchQuery.trim() ? 'Try a different search term' : 'Add your first item'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              const startPress = () => {
                pressTimerRef.current = setTimeout(() => handleLongPress(item), 500);
              };
              const cancelPress = () => {
                if (pressTimerRef.current) {
                  clearTimeout(pressTimerRef.current);
                  pressTimerRef.current = null;
                }
              };
              return (
                <div key={item.id}
                  onClick={() => navigate('itemDetail', { itemId: item.id })}
                  onTouchStart={startPress}
                  onTouchEnd={cancelPress}
                  onMouseDown={startPress}
                  onMouseUp={cancelPress}
                  onMouseLeave={cancelPress}
                  className="text-left bg-[#0B1525] rounded-2xl overflow-hidden border border-[#1D344D]/40 active:scale-[0.97] transition-transform select-none cursor-pointer"
                >
                  {/* Photo */}
                <div className="relative aspect-square bg-[#081321]">
                  {item.photos && item.photos.length > 0 ? (
                    <PhotoImage
                      photoRef={item.photos[0]}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-3xl">📦</span>
                    </div>
                  )}
                  {/* Status Badge */}
                  <span className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusColor(item.inLocker)}`}>
                    {item.inLocker ? 'In Locker' : 'Out of Locker'}
                  </span>
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-[#F7F5EF] truncate">{item.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryDot(item.category) }} />
                    <span className="text-xs text-[#A6B2C2]">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-[#667487]">
                    <Calendar className="w-3 h-3" />
                    <span className="text-[10px]">{formatDate(item.dateAdded)}</span>
                  </div>
                </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center z-10 pointer-events-none">
        <button
          onClick={() => navigate('addItem', { preselectedLockerId: lockerId, editItem: null })}
          aria-label="Add item"
          className="pointer-events-auto w-14 h-14 rounded-full bg-[#5ED6A5] text-[#050A12] flex items-center justify-center shadow-lg shadow-[#5ED6A5]/30 active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
        <span className="text-xs text-[#5ED6A5] font-medium mt-1.5">Add Item</span>
      </div>

      {/* Menu Drawer */}
      {menuOpen && <MenuDrawer onClose={() => setMenuOpen(false)} />}

      {/* Delete Confirmation */}
      {showDeleteConfirm && contextItem && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6">
          <div className="bg-[#0B1525] border border-[#1D344D] rounded-3xl p-6 w-full max-w-xs text-center">
            <div className="w-12 h-12 rounded-full bg-[#E98B8B]/10 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 text-[#E98B8B]" />
            </div>
            <h3 className="text-lg font-bold text-[#F7F5EF] mb-1">Delete Item?</h3>
            <p className="text-sm text-[#A6B2C2] mb-5">"{contextItem.name}" will be permanently deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteConfirm(false); setContextItem(null); }}
                className="flex-1 py-3 rounded-2xl border border-[#1D344D] text-sm font-semibold text-[#A6B2C2] active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button onClick={handleItemDelete}
                className="flex-1 py-3 rounded-2xl bg-[#E98B8B] text-sm font-semibold text-[#050A12] active:scale-95 transition-transform"
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
