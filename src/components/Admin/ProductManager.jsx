import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit2, Trash2, UploadCloud, Search, Check, X, Image as ImageIcon, FolderTree, Save, Undo2 } from 'lucide-react';
import { apiUrl } from '../../config/api';

export default function ProductManager({ products = [], categories = [], onRefresh }) {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  // Category Management State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatBlurb, setNewCatBlurb] = useState('');
  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatLabel, setEditCatLabel] = useState('');
  const [editCatBlurb, setEditCatBlurb] = useState('');
  const [isSavingCat, setIsSavingCat] = useState(false);
  const [catFeedback, setCatFeedback] = useState(null);

  // Lock body scroll when either modal is open
  useEffect(() => {
    if (isCategoryModalOpen || isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCategoryModalOpen, isModalOpen]);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatLabel.trim()) return;

    setIsSavingCat(true);
    setCatFeedback(null);
    try {
      const res = await fetch(apiUrl('/api/categories'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newCatLabel.trim(),
          blurb: newCatBlurb.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setNewCatLabel('');
        setNewCatBlurb('');
        setCatFeedback({ type: 'success', message: `Category "${data.label}" added successfully!` });
        if (onRefresh) onRefresh();
      } else {
        setCatFeedback({ type: 'error', message: data.error || 'Failed to add category' });
      }
    } catch {
      setCatFeedback({ type: 'error', message: 'Network error adding category' });
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleStartEditCategory = (cat) => {
    setEditingCatId(cat.id);
    setEditCatLabel(cat.label);
    setEditCatBlurb(cat.blurb || '');
    setCatFeedback(null);
  };

  const handleSaveEditCategory = async (catId) => {
    if (!editCatLabel.trim()) return;

    setIsSavingCat(true);
    setCatFeedback(null);
    try {
      const res = await fetch(apiUrl(`/api/categories/${catId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: editCatLabel.trim(),
          blurb: editCatBlurb.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setEditingCatId(null);
        setCatFeedback({ type: 'success', message: `Category updated successfully!` });
        if (onRefresh) onRefresh();
      } else {
        setCatFeedback({ type: 'error', message: data.error || 'Failed to update category' });
      }
    } catch {
      setCatFeedback({ type: 'error', message: 'Network error updating category' });
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    const productCount = products.filter(p => p.category === cat.id).length;
    if (productCount > 0) {
      alert(`Cannot delete category "${cat.label}" because it contains ${productCount} ${productCount === 1 ? 'product' : 'products'}. Please delete or change the category of those products first.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the category "${cat.label}"? This cannot be undone.`)) {
      return;
    }

    setIsSavingCat(true);
    setCatFeedback(null);
    try {
      const res = await fetch(apiUrl(`/api/categories/${cat.id}`), {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        setCatFeedback({ type: 'success', message: `Category "${cat.label}" deleted successfully!` });
        if (selectedCat === cat.id) {
          setSelectedCat('all');
        }
        if (onRefresh) onRefresh();
      } else {
        setCatFeedback({ type: 'error', message: data.error || 'Failed to delete category' });
      }
    } catch {
      setCatFeedback({ type: 'error', message: 'Network error deleting category' });
    } finally {
      setIsSavingCat(false);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'pizza',
    description: '',
    price: '',
    image: '',
    tag: '',
    inStock: true,
    hasSizes: false,
    smallPrice: '',
    mediumPrice: '',
    largePrice: ''
  });

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'pizza',
      description: '',
      price: '',
      image: '',
      tag: '',
      inStock: true,
      hasSizes: false,
      smallPrice: '',
      mediumPrice: '',
      largePrice: ''
    });
    setImagePreview('');
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    const hasSizes = product.sizes && product.sizes.length > 0;
    const s = product.sizes?.find(sz => sz.label.toLowerCase() === 'small')?.price || '';
    const m = product.sizes?.find(sz => sz.label.toLowerCase() === 'medium')?.price || '';
    const l = product.sizes?.find(sz => sz.label.toLowerCase() === 'large')?.price || '';

    setFormData({
      name: product.name,
      category: product.category,
      description: product.description || '',
      price: product.price || '',
      image: product.image || '',
      tag: product.tag || '',
      inStock: product.inStock !== false,
      hasSizes: Boolean(hasSizes),
      smallPrice: s,
      mediumPrice: m,
      largePrice: l
    });
    setImagePreview(product.image || '');
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const data = new FormData();
    data.append('image', file);

    try {
      const res = await fetch(apiUrl('/api/upload'), {
        method: 'POST',
        body: data
      });
      const result = await res.json();
      if (res.ok && result.url) {
        setFormData(prev => ({ ...prev, image: result.url }));
        setImagePreview(result.url);
      } else {
        alert(result.error || 'Image upload failed');
      }
    } catch {
      alert('Failed to upload image to server');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const sizes = [];
    if (formData.hasSizes) {
      if (formData.smallPrice) sizes.push({ label: 'Small', price: Number(formData.smallPrice) });
      if (formData.mediumPrice) sizes.push({ label: 'Medium', price: Number(formData.mediumPrice) });
      if (formData.largePrice) sizes.push({ label: 'Large', price: Number(formData.largePrice) });
    }

    const payload = {
      name: formData.name,
      category: formData.category,
      description: formData.description,
      price: Number(formData.price) || (sizes.length > 0 ? sizes[0].price : 0),
      image: formData.image || '/assets/images/cat-special-CdXGKIOV.jpg',
      tag: formData.tag,
      inStock: formData.inStock,
      sizes
    };

    try {
      if (editingProduct) {
        // Update
        const res = await fetch(apiUrl(`/api/products/${editingProduct.id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Update failed');
      } else {
        // Create
        const res = await fetch(apiUrl('/api/products'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Create failed');
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const res = await fetch(apiUrl(`/api/products/${id}`), { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      } else {
        alert('Failed to delete product');
      }
    } catch {
      alert('Network error deleting product');
    }
  };

  // Quick 1-click Out of Stock toggle
  const [updatingStockId, setUpdatingStockId] = useState(null);

  const handleToggleStock = async (product) => {
    const newStatus = product.inStock === false ? true : false;
    setUpdatingStockId(product.id);
    try {
      const res = await fetch(apiUrl(`/api/products/${product.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inStock: newStatus })
      });
      if (res.ok) {
        if (onRefresh) onRefresh();
      } else {
        alert('Failed to update product stock status');
      }
    } catch {
      alert('Network error updating stock status');
    } finally {
      setUpdatingStockId(null);
    }
  };

  // Filter products
  const filtered = products.filter(p => {
    const matchesCat = selectedCat === 'all' || p.category === selectedCat;
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Top action bar */}
      <div className="space-y-3">
        {/* Full-width Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-2xs"
          />
        </div>

        {/* Categories Controls & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Category Filter Dropdown */}
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full sm:w-auto py-2.5 px-3 rounded-xl bg-white border border-zinc-300 text-xs text-zinc-900 focus:outline-none focus:border-orange-500 shadow-2xs cursor-pointer font-medium"
            >
              <option value="all">All Categories ({products.length})</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.label} ({products.filter(p => p.category === c.id).length})
                </option>
              ))}
            </select>

            {/* Manage Categories Button (under categories dropdown on mobile) */}
            <button
              onClick={() => {
                setCatFeedback(null);
                setEditingCatId(null);
                setIsCategoryModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 font-bold text-xs uppercase tracking-wider shadow-2xs transition-all hover:border-zinc-400 cursor-pointer"
              title="Add, edit, or remove categories"
            >
              <FolderTree className="w-4 h-4 text-orange-600" />
              <span>Manage Categories</span>
            </button>
          </div>

          {/* Upload New Product Button */}
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload New Product</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-700">
            <thead className="bg-zinc-50 text-zinc-500 uppercase text-[10px] tracking-wider border-b border-zinc-200 font-bold">
              <tr className="divide-x divide-zinc-200/80">
                <th className="px-5 py-3.5">Item</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Pricing / Sizes</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map(product => (
                <tr key={product.id} className="divide-x divide-zinc-100 hover:bg-zinc-50/80 transition-colors">
                  <td className="px-5 py-3 flex items-center gap-3">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover bg-zinc-100 border border-zinc-200 flex-shrink-0"
                      onError={(e) => {
                        e.target.src = '/assets/images/cat-special-CdXGKIOV.jpg';
                      }}
                    />
                    <div>
                      <span className="font-bold text-zinc-900 block text-sm">
                        {product.name}
                      </span>
                      <span className="text-zinc-500 line-clamp-1 text-[11px] max-w-xs">
                        {product.description || 'No description'}
                      </span>
                      {product.tag && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 font-semibold text-[9px] uppercase">
                          {product.tag}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 font-medium capitalize">
                      {product.category}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {product.sizes && product.sizes.length > 0 ? (
                      <div className="space-y-0.5">
                        {product.sizes.map(s => (
                          <div key={s.label} className="text-[11px] text-zinc-700">
                            <span className="text-zinc-400">{s.label}:</span>{' '}
                            <span className="font-bold text-zinc-900">Rs. {s.price}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="font-bold text-zinc-900 text-sm">
                        Rs. {product.price?.toLocaleString()}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleStock(product)}
                      disabled={updatingStockId === product.id}
                      title={product.inStock !== false ? "Click to mark Out of Stock" : "Click to mark In Stock"}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
                        product.inStock !== false
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-700 border border-red-300 hover:bg-red-100'
                      } ${updatingStockId === product.id ? 'opacity-60 cursor-wait' : ''}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${product.inStock !== false ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      <span>{updatingStockId === product.id ? 'Updating...' : product.inStock !== false ? 'In Stock' : 'Out of Stock'}</span>
                    </button>
                  </td>

                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(product)}
                        className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                        title="Edit product"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 transition-colors cursor-pointer"
                        title="Delete product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] overflow-y-auto flex items-start sm:items-center justify-center p-3 sm:p-4 pt-6 pb-6 sm:py-8 bg-black/60 backdrop-blur-xs">
            <div className="relative bg-white border border-zinc-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-xl w-full text-zinc-900 shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 mb-6">
              <h3 className="font-display text-2xl uppercase tracking-wide text-zinc-900">
                {editingProduct ? 'Edit Product' : 'Upload New Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 border border-zinc-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Product Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Zinger Supreme Burger"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-orange-500 capitalize shadow-2xs"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ingredients or details (e.g. Crispy fillet with cheese & smoky sauce)"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none shadow-2xs"
                />
              </div>

              {/* Image Upload or URL */}
              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Product Image
                </label>
                <div className="flex items-center gap-3">
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-16 h-16 rounded-xl object-cover border border-zinc-200 bg-zinc-100"
                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <label className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-dashed border-zinc-300 cursor-pointer text-zinc-700 transition-colors">
                      <UploadCloud className="w-4 h-4 text-orange-600" />
                      <span>{uploading ? 'Uploading image...' : 'Upload Image File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={formData.image}
                      onChange={(e) => {
                        setFormData({ ...formData, image: e.target.value });
                        setImagePreview(e.target.value);
                      }}
                      placeholder="Or enter image URL (e.g. /assets/images/...)"
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-700"
                    />
                  </div>
                </div>
              </div>

              {/* Has Sizes Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasSizes}
                    onChange={(e) => setFormData({ ...formData, hasSizes: e.target.checked })}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-zinc-300 cursor-pointer"
                  />
                  <span className="font-bold text-zinc-800">
                    This item has multiple sizes (Small / Medium / Large)
                  </span>
                </label>
              </div>

              {formData.hasSizes ? (
                <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                  <div>
                    <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">
                      Small Price (<span className="normal-case">Rs.</span>)
                    </label>
                    <input
                      type="number"
                      value={formData.smallPrice}
                      onChange={(e) => setFormData({ ...formData, smallPrice: e.target.value })}
                      placeholder="e.g. 450"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">
                      Medium Price (<span className="normal-case">Rs.</span>)
                    </label>
                    <input
                      type="number"
                      value={formData.mediumPrice}
                      onChange={(e) => setFormData({ ...formData, mediumPrice: e.target.value })}
                      placeholder="e.g. 800"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">
                      Large Price (<span className="normal-case">Rs.</span>)
                    </label>
                    <input
                      type="number"
                      value={formData.largePrice}
                      onChange={(e) => setFormData({ ...formData, largePrice: e.target.value })}
                      placeholder="e.g. 1200"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                    Price (<span className="normal-case">Rs.</span>) *
                  </label>
                  <input
                    type="number"
                    required={!formData.hasSizes}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="e.g. 300"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-2xs"
                  />
                </div>
              )}

              {/* Tag and In Stock */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                    Badge / Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    placeholder="e.g. Bestseller, Signature"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-2xs"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.inStock}
                      onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-zinc-300 cursor-pointer"
                    />
                    <span className="font-bold text-zinc-800">Available In Stock</span>
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase tracking-wider shadow cursor-pointer transition-all"
                >
                  {editingProduct ? 'Save Changes' : 'Upload Product'}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Manage Categories Modal */}
      {isCategoryModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto pt-4 pb-6 sm:py-8 animate-in fade-in duration-150"
            onClick={() => setIsCategoryModalOpen(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-zinc-200 space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-150 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center">
                  <FolderTree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-zinc-900 flex items-center gap-2">
                    <span>Manage Categories</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 font-semibold">
                      {categories.length} total
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Add new categories, edit names/descriptions, or remove unused categories.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Feedback Alert */}
            {catFeedback && (
              <div className={`p-3 rounded-xl text-xs flex items-center justify-between ${
                catFeedback.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}>
                <span>{catFeedback.message}</span>
                <button
                  type="button"
                  onClick={() => setCatFeedback(null)}
                  className="text-xs font-bold hover:underline ml-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Section 1: Add New Category */}
            <form onSubmit={handleAddCategory} className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/80 space-y-3">
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider block">
                + Add New Category
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Beverages, Desserts, Dips"
                    value={newCatLabel}
                    onChange={(e) => setNewCatLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-300 text-xs text-zinc-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                    Description / Blurb
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cold drinks, milkshakes, and sodas"
                    value={newCatBlurb}
                    onChange={(e) => setNewCatBlurb(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-300 text-xs text-zinc-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSavingCat || !newCatLabel.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSavingCat ? 'Adding...' : 'Add Category'}</span>
                </button>
              </div>
            </form>

            {/* Section 2: Existing Categories List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                Existing Categories ({categories.length})
              </span>

              <div className="border border-zinc-200 rounded-xl divide-y divide-zinc-100 max-h-52 sm:max-h-72 overflow-y-auto custom-dropdown-scroll bg-white">
                {categories.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500">
                    No categories found. Add your first category above!
                  </div>
                ) : (
                  categories.map((cat) => {
                    const isEditing = editingCatId === cat.id;
                    const catProductCount = products.filter(p => p.category === cat.id).length;

                    return (
                      <div key={cat.id} className="p-3 hover:bg-zinc-50/60 transition-colors">
                        {isEditing ? (
                          <div className="space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-zinc-500 block mb-0.5">Category Name</label>
                                <input
                                  type="text"
                                  value={editCatLabel}
                                  onChange={(e) => setEditCatLabel(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-semibold focus:outline-none focus:border-orange-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-zinc-500 block mb-0.5">Description / Blurb</label>
                                <input
                                  type="text"
                                  value={editCatBlurb}
                                  onChange={(e) => setEditCatBlurb(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs focus:outline-none focus:border-orange-500"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingCatId(null)}
                                className="px-3 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Undo2 className="w-3 h-3" />
                                <span>Cancel</span>
                              </button>
                              <button
                                type="button"
                                disabled={isSavingCat || !editCatLabel.trim()}
                                onClick={() => handleSaveEditCategory(cat.id)}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Save className="w-3 h-3" />
                                <span>{isSavingCat ? 'Saving...' : 'Save'}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-zinc-900">
                                  {cat.label}
                                </span>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  catProductCount > 0
                                    ? 'bg-orange-50 text-orange-700 border border-orange-200/60'
                                    : 'bg-zinc-100 text-zinc-500'
                                }`}>
                                  {catProductCount} {catProductCount === 1 ? 'product' : 'products'}
                                </span>
                              </div>
                              {cat.blurb && (
                                <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                                  {cat.blurb}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditCategory(cat)}
                                className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 transition-colors cursor-pointer"
                                title="Edit Category Name & Description"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  catProductCount > 0
                                    ? 'bg-zinc-100 text-zinc-400 hover:bg-zinc-100 cursor-not-allowed opacity-60'
                                    : 'bg-red-50 hover:bg-red-100 text-red-600'
                                }`}
                                title={
                                  catProductCount > 0
                                    ? `Cannot delete: contains ${catProductCount} products`
                                    : 'Delete Category'
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-2 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
