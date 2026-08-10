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
    <div className="flex flex-col h-full bg-[#081321]">
      <div style={{ height: topInset }} />

      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={goBack}
            aria-label="Back"
            className="p-2 -ml-2 rounded-full active:bg-white/5"
          >
            <ArrowLeft className="w-5 h-5 text-[#A6B2C2]" />
          </button>
          <h1 className="text-[#F7F5EF] font-bold text-lg">Manage Lockers</h1>
          <button
            onClick={() => { setShowAdd(true); resetForm(); }}
            aria-label="Add Locker"
            className="p-2 -mr-2 rounded-full active:bg-white/5"
          >
            <Plus className="w-5 h-5 text-[#A6B2C2]" />
          </button>
        </div>
      </div>

      {/* Locker List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-6">
        {lockers.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-[#A6B2C2]/30 mx-auto mb-3" />
            <p className="text-[#A6B2C2] text-sm">No lockers yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lockers.map((locker) => (
              <div
                key={locker.id}
                className="bg-[#101F32] rounded-xl border border-[#1D344D] p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0B2447] flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-[#D6B45C]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#F7F5EF]">{locker.name}</h3>
                    {locker.bankName && (
                      <p className="text-[#A6B2C2] text-xs mt-0.5">{locker.bankName}</p>
                    )}
                    <p className="text-[#A6B2C2]/60 text-xs mt-1">{totalItems(locker.id)} items</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(locker)}
                      className="p-2 rounded-lg hover:bg-[#1D344D] text-[#A6B2C2]"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(locker.id)}
                      aria-label={`Delete ${locker.name}`}
                      className="p-2 rounded-lg hover:bg-[#3A2427] text-[#E98B8B]"
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
          <div className="bg-[#101F32] rounded-2xl w-full max-w-sm p-5 max-h-[80vh] overflow-y-auto border border-[#1D344D]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#F7F5EF]">
                {editingLocker ? 'Edit Locker' : 'Add Locker'}
              </h2>
              <button
                onClick={() => { setShowAdd(false); setEditingLocker(null); resetForm(); }}
                className="p-1 rounded-lg hover:bg-[#1D344D]"
              >
                <X className="w-5 h-5 text-[#A6B2C2]" />
              </button>
            </div>

            <label className="block text-sm text-[#A6B2C2] mb-1">
              Locker Name <span className="text-[#E98B8B]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#081321] border border-[#1D344D] text-[#F7F5EF] rounded-xl focus:border-[#D6B45C]/50 focus:outline-none text-sm mb-3"
              placeholder="e.g., Locker 1"
            />

            <label className="block text-sm text-[#A6B2C2] mb-1">Bank Name</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#081321] border border-[#1D344D] text-[#F7F5EF] rounded-xl focus:border-[#D6B45C]/50 focus:outline-none text-sm mb-3"
              placeholder="e.g., HDFC Bank"
            />

            <label className="block text-sm text-[#A6B2C2] mb-1">Branch</label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#081321] border border-[#1D344D] text-[#F7F5EF] rounded-xl focus:border-[#D6B45C]/50 focus:outline-none text-sm mb-3"
              placeholder="e.g., Main Branch"
            />

            <label className="block text-sm text-[#A6B2C2] mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#081321] border border-[#1D344D] text-[#F7F5EF] rounded-xl focus:border-[#D6B45C]/50 focus:outline-none text-sm mb-4"
              placeholder="e.g., City, State"
            />

            <button
              onClick={editingLocker ? handleUpdate : handleAdd}
              disabled={!name.trim()}
              className="w-full py-3 rounded-xl bg-[#D6B45C] text-[#081321] font-medium text-sm hover:bg-[#D6B45C]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          <div className="bg-[#101F32] rounded-2xl w-full max-w-sm p-5 border border-[#1D344D]">
            <h2 className="text-lg font-bold text-[#F7F5EF] mb-1">Delete Locker?</h2>
            <p className="text-[#A6B2C2] text-sm mb-4">
              Items in this locker will be moved to the default locker. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#1D344D] text-[#A6B2C2] font-medium text-sm hover:bg-[#1D344D]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-[#F7F5EF] font-medium text-sm hover:bg-[#E98B8B]"
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
