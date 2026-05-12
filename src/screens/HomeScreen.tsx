import { useState, useEffect, useCallback } from 'react';
import { Lock, Plus, Settings, ImageIcon, Trash2, Eye, Scale, Receipt, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getItems, deleteItem } from '@/utils/storage';
import PhotoImage from '@/components/PhotoImage';
import type { LockerItem } from '@/types';
import { CATEGORY_COLORS, APP_NAME } from '@/types';

type Toast = { id: number; message: string; type: 'success' | 'error' };

export default function HomeScreen() {
  const { navigate } = useApp();
  const [items, setItems] = useState<LockerItem[]>([]);
  const [contextMenu, setContextMenu] = useState<{ item: LockerItem; x: number; y: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<LockerItem | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const loadItems = useCallback(async () => {
    const data = await getItems();
    setItems(data);
    setLoaded(true);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleDelete = async (item: LockerItem) => {
    await deleteItem(item.id);
    setDeleteConfirm(null);
    setContextMenu(null);
    addToast(`"${item.name}" deleted`, 'success');
    loadItems();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleLongPress = (item: LockerItem, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ item, x: Math.min(e.clientX, 300), y: Math.min(e.clientY, 500) });
  };

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

      {/* Summary Card */}
      <div className="mx-5 mb-4 p-4 rounded-2xl card-vault">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#8A94A6] uppercase tracking-wider">Items in Locker</p>
            <p className="text-3xl font-bold text-white mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>{items.length}</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-[#C9A84C]/10 flex items-center justify-center overflow-hidden">
            <img src="/vlocker-icon.png" alt={APP_NAME} className="w-12 h-12 object-contain" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {!loaded ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl bg-[#111D2E] border border-[#1A3A5C] h-52 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <div className="w-32 h-32 rounded-full bg-[#111D2E] border border-[#1A3A5C] flex items-center justify-center mb-6 relative">
              <Lock className="w-14 h-14 text-[#8A94A6]/40" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#0A1628] border border-[#1A3A5C] flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-[#8A94A6]/40" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Your Locker is Empty
            </h3>
            <p className="text-sm text-[#8A94A6] text-center max-w-[240px]">
              Tap the + button to start adding items to your secure {APP_NAME}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item, index) => {
              const catColor = CATEGORY_COLORS[item.category] || '#95A5A6';
              const displayCategory = item.category === 'Other' ? (item.categoryCustom || 'Other') : item.category;
              const displaySubType = item.subType === 'Other (jewellery)' || item.subType === 'Other (document)'
                ? (item.subTypeCustom || item.subType)
                : item.subType;
              const weightSummary = item.weightAmount
                ? `${item.weightAmount} ${item.weightUnit}`
                : '';

              return (
                <div key={item.id}
                  onClick={() => navigate('itemDetail', item.id)}
                  onContextMenu={(e) => handleLongPress(item, e)}
                  onTouchStart={(e) => {
                    const timer = setTimeout(() => {
                      const touch = e.touches[0];
                      if (touch) handleLongPress(item, { preventDefault: () => {}, clientX: touch.clientX, clientY: touch.clientY } as React.MouseEvent);
                    }, 600);
                    (e.currentTarget as HTMLElement).addEventListener('touchend', () => clearTimeout(timer), { once: true });
                  }}
                  className="rounded-2xl card-vault overflow-hidden active:scale-[0.98] transition-transform cursor-pointer animate-slide-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Photo */}
                  <div className="relative aspect-square bg-[#0D1929]">
                    {item.photos.length > 0 ? (
                      <>
                        <PhotoImage
                          photoRef={item.photos[0]}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        {item.photos.length > 1 && (
                          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
                            <span className="text-xs text-white font-medium">{item.photos.length}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-[#8A94A6]/30" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="text-sm font-medium text-white truncate">{item.name}</p>
                    <p className="text-[11px] text-[#8A94A6] mt-0.5 truncate">{displaySubType || displayCategory}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
                        backgroundColor: `${catColor}20`, color: catColor, border: `1px solid ${catColor}30`,
                      }}>
                        {displayCategory}
                      </span>
                      <div className="flex items-center gap-2">
                        {item.billPhotos && item.billPhotos.length > 0 && (
                          <span className="text-[10px] text-[#10B981] flex items-center gap-0.5">
                            <Receipt className="w-2.5 h-2.5" />Bill
                          </span>
                        )}
                        {weightSummary && (
                          <span className="text-[10px] text-[#8A94A6] flex items-center gap-0.5">
                            <Scale className="w-2.5 h-2.5" />{weightSummary}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-[#8A94A6] mt-1">{formatDate(item.dateAdded)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={() => navigate('addItem')} aria-label="Add Item"
        className="absolute bottom-6 right-5 w-14 h-14 rounded-full bg-[#C9A84C] flex items-center justify-center shadow-lg active:scale-95 transition-transform z-10 animate-pulse-gold"
      >
        <Plus className="w-6 h-6 text-[#0A1628]" strokeWidth={2.5} />
      </button>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="absolute inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div className="absolute z-50 bg-[#111D2E] border border-[#1A3A5C] rounded-2xl shadow-xl overflow-hidden min-w-[160px] animate-scale-in"
            style={{ left: contextMenu.x > 200 ? contextMenu.x - 160 : contextMenu.x, top: contextMenu.y > 400 ? contextMenu.y - 100 : contextMenu.y }}
          >
            <button onClick={() => { navigate('itemDetail', contextMenu.item.id); setContextMenu(null); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-[#1A3A5C] transition-colors"
            >
              <Eye className="w-4 h-4 text-[#8A94A6]" />View Details
            </button>
            <button onClick={() => { setDeleteConfirm(contextMenu.item); setContextMenu(null); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />Delete
            </button>
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
          <div className="bg-[#111D2E] border border-[#1A3A5C] rounded-3xl p-6 w-full max-w-[340px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><Trash2 className="w-5 h-5 text-red-400" /></div>
              <h3 className="text-lg font-bold text-white">Delete Item</h3>
            </div>
            <p className="text-sm text-[#8A94A6] mb-2">Remove <span className="text-white font-medium">{deleteConfirm.name}</span> from your {APP_NAME}?</p>
            <p className="text-sm text-red-400 mb-6">This will delete all photos and information permanently.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 rounded-2xl bg-[#1A3A5C] text-white text-sm font-medium active:scale-95 transition-transform">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-medium active:scale-95 transition-transform">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Note */}
      <div className="shrink-0 flex items-center justify-center gap-1.5 text-[10px] text-emerald-400/70 bg-emerald-500/5 px-4 py-2 border-t border-emerald-500/10">
        <Shield className="w-3 h-3 flex-shrink-0" />
        <span>Your data stays on your device - completely private &amp; secure</span>
      </div>
    </div>
  );
}
