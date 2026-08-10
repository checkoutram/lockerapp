import { useState, useEffect } from 'react';

import type { Locker } from '@/types';
import {
  getLockers,
  addLocker as storageAddLocker,
  deleteLocker as storageDeleteLocker,
  updateLocker as storageUpdateLocker,
  setItems as storageSetItems,
} from '@/utils/storage';

import { SafeArea } from 'capacitor-plugin-safe-area';

import { useApp } from '@/context/AppContext';

import {
  ArrowLeft,
  Building2,
  Edit3,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';

export default function ManageLockersScreen() {
  const { lockers, setLockers, items, setItems, showAlert, goBack } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [editingLocker, setEditingLocker] = useState<Locker | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [branch, setBranch] = useState('');
  const [location, setLocation] = useState('');
  const [topInset, setTopInset] = useState(0);
  const [bottomInset, setBottomInset] = useState(0);

  useEffect(() => {
    SafeArea.getSafeAreaInsets().then(({ insets }: any) => {
      setTopInset(insets.top);
      setBottomInset(insets.bottom);
    });
  }, []);

  const resetForm = () => {
    setName('');
    setBankName('');
    setBranch('');
    setLocation('');
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    const newLocker: Locker = {
      id: `locker_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      bankName: bankName.trim() || undefined,
      branch: branch.trim() || undefined,
      location: location.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    await storageAddLocker(newLocker);
    const updated = await getLockers();
    setLockers(updated);
    resetForm();
    setShowAdd(false);
    showAlert('Locker added', 'success');
  };

  const handleUpdate = async () => {
    if (!editingLocker || !name.trim()) return;
    const updated: Locker = {
      ...editingLocker,
      name: name.trim(),
      bankName: bankName.trim() || undefined,
      branch: branch.trim() || undefined,
      location: location.trim() || undefined,
    };
    await storageUpdateLocker(updated);
    const updatedList = await getLockers();
    setLockers(updatedList);
    setEditingLocker(null);
    resetForm();
    showAlert('Locker updated', 'success');
  };

  const handleDelete = async (lockerId: string) => {
    const allLockers = await getLockers();
    if (allLockers.length <= 1) {
      showAlert('Cannot delete the last locker. At least one locker is required.', 'error');
      setShowDeleteConfirm(null);
      return;
    }

    const itemsInLocker = items.filter((i) => i.lockerId === lockerId);

    if (itemsInLocker.length > 0) {
      const updatedItems = items.map((i) =>
        i.lockerId === lockerId ? { ...i, lockerId: 'default' } : i
      );
      await storageSetItems(updatedItems);
      setItems(updatedItems);
    }

    await storageDeleteLocker(lockerId);
    const updated = await getLockers();
    setLockers(updated);
    setShowDeleteConfirm(null);
    showAlert('Locker deleted', 'success');
  };

  const startEdit = (locker: Locker) => {
    setEditingLocker(locker);
    setName(locker.name);
    setBankName(locker.bankName || '');
    setBranch(locker.branch || '');
    setLocation(locker.location || '');
  };

  const totalItems = (lockerId: string) => items.filter((i) => i.lockerId === lockerId).length;

  return (
    <div className="flex flex-col h-full bg-[#0A1628]">
      <div style={{ height: topInset }} />

      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={goBack}
            aria-label="Back"
            className="p-2 -ml-2 rounded-full active:bg-white/5"
          >
            <ArrowLeft className="w-5 h-5 text-[#8A94A6]" />
          </button>
          <h1 className="text-white font-bold text-lg">Manage Lockers</h1>
          <button
            onClick={() => { setShowAdd(true); resetForm(); }}
            aria-label="Add Locker"
            className="p-2 -mr-2 rounded-full active:bg-white/5"
          >
            <Plus className="w-5 h-5 text-[#8A94A6]" />
          </button>
        </div>
      </div>

      {/* Locker List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-6">
        {lockers.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-[#8A94A6]/30 mx-auto mb-3" />
            <p className="text-[#8A94A6] text-sm">No lockers yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lockers.map((locker) => (
              <div
                key={locker.id}
                className="bg-[#111D2E] rounded-xl border border-[#1A3A5C] p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0B3B5C]/20 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-[#C9A84C]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white">{locker.name}</h3>
                    {locker.bankName && (
                      <p className="text-[#8A94A6] text-xs mt-0.5">{locker.bankName}</p>
                    )}
                    <p className="text-[#8A94A6]/60 text-xs mt-1">{totalItems(locker.id)} items</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(locker)}
                      className="p-2 rounded-lg hover:bg-[#1A3A5C] text-[#8A94A6]"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(locker.id)}
                      aria-label={`Delete ${locker.name}`}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAdd || editingLocker) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#111D2E] rounded-2xl w-full max-w-sm p-5 max-h-[80vh] overflow-y-auto border border-[#1A3A5C]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                {editingLocker ? 'Edit Locker' : 'Add Locker'}
              </h2>
              <button
                onClick={() => { setShowAdd(false); setEditingLocker(null); resetForm(); }}
                className="p-1 rounded-lg hover:bg-[#1A3A5C]"
              >
                <X className="w-5 h-5 text-[#8A94A6]" />
              </button>
            </div>

            <label className="block text-sm text-[#8A94A6] mb-1">
              Locker Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#0A1628] border border-[#1A3A5C] text-white rounded-xl focus:border-[#C9A84C]/50 focus:outline-none text-sm mb-3"
              placeholder="e.g., Locker 1"
            />

            <label className="block text-sm text-[#8A94A6] mb-1">Bank Name</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#0A1628] border border-[#1A3A5C] text-white rounded-xl focus:border-[#C9A84C]/50 focus:outline-none text-sm mb-3"
              placeholder="e.g., HDFC Bank"
            />

            <label className="block text-sm text-[#8A94A6] mb-1">Branch</label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#0A1628] border border-[#1A3A5C] text-white rounded-xl focus:border-[#C9A84C]/50 focus:outline-none text-sm mb-3"
              placeholder="e.g., Main Branch"
            />

            <label className="block text-sm text-[#8A94A6] mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#0A1628] border border-[#1A3A5C] text-white rounded-xl focus:border-[#C9A84C]/50 focus:outline-none text-sm mb-4"
              placeholder="e.g., City, State"
            />

            <button
              onClick={editingLocker ? handleUpdate : handleAdd}
              disabled={!name.trim()}
              className="w-full py-3 rounded-xl bg-[#C9A84C] text-[#0A1628] font-medium text-sm hover:bg-[#C9A84C]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingLocker ? 'Save Changes' : 'Save Locker'}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#111D2E] rounded-2xl w-full max-w-sm p-5 border border-[#1A3A5C]">
            <h2 className="text-lg font-bold text-white mb-1">Delete Locker?</h2>
            <p className="text-[#8A94A6] text-sm mb-4">
              Items in this locker will be moved to the default locker. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#1A3A5C] text-[#8A94A6] font-medium text-sm hover:bg-[#1A3A5C]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: bottomInset }} />
    </div>
  );
}
