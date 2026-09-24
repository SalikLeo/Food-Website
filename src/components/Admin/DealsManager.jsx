import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Edit2,
  Trash2,
  Plus,
  Check,
  X,
  Flame,
  Upload,
  AlertTriangle,
  Users,
  ChevronDown,
  AlertCircle,
  Star,
  Search
} from 'lucide-react';
import { apiUrl } from '../../config/api';
import { formatPrice, cleanDealInclusions } from '../../utils/formatters';

const PRESET_DEAL_IMAGES = [
  { label: 'Family Deal Bundle', src: '/assets/deal-family.png' },
  { label: 'Deal 1 (Zinger + Patty + Coke)', src: '/assets/deal-1.png' },
  { label: 'Deal 2 (Zinger + Nuggets + Coke)', src: '/assets/deal-2.png' },
  { label: 'Deal 3 (5 Zingers + Coke 1.5L)', src: '/assets/deal-3.png' },
  { label: 'Deal 4 (Zinger + Pizza + Coke)', src: '/assets/deal-4.png' },
  { label: 'Deal 5 (2 Small Pizzas + Coke)', src: '/assets/deal-5.png' },
  { label: 'Deal 6 (1 Large Pizza + Coke 1.5L)', src: '/assets/deal-6.png' },
  { label: 'Deal 7 (Small + Medium Pizza + Coke)', src: '/assets/deal-7.png' },
  { label: 'Deal 8 (2 Medium Pizzas + Coke)', src: '/assets/deal-8.png' },
  { label: 'Deal 9 (2 Large Pizzas + Coke)', src: '/assets/deal-9.png' },
  { label: 'Deal 10 (Medium + Large Pizza + Coke)', src: '/assets/deal-10.png' },
  { label: 'Deal 11 (3 Zingers + Coke 1L)', src: '/assets/deal-11.png' },
];

function isFamilyDeal(deal) {
  if (!deal) return false;
  return (
    deal.dealType === 'family' ||
    deal.id === 'family-deal' ||
    (deal.name && deal.name.toLowerCase().includes('family'))
  );
}

// Extracts base name without category in brackets, e.g. "Cheese Stuff (Pizza)" -> "cheese stuff"
function extractBaseName(str = '') {
  return str.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
}

function parseItemString(str, index) {
  const match = str.match(/^(\d+)\s*[xX]?\s*(.+)$/);
  if (match) {
    const rawName = cleanDealInclusions(match[2].trim());
    return {
      id: `item-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      qty: parseInt(match[1], 10) || 1,
      name: rawName
    };
  }
  const rawName = cleanDealInclusions(str.trim());
  return {
    id: `item-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    qty: 1,
    name: rawName
  };
}

// Detect if an item is a pizza or sized item and return its size status & options
function getItemSizeInfo(rawName, products = []) {
  if (!rawName || typeof rawName !== 'string') return null;
  const clean = rawName.trim();
  if (!clean) return null;

  const lower = clean.toLowerCase();

  // Category in brackets if present, e.g. "(Pizza)"
  const catMatch = clean.match(/\(([^)]+)\)$/);
  const catInBracket = catMatch ? catMatch[1].toLowerCase().trim() : '';

  // Base without category
  const withoutCat = clean.replace(/\s*\([^)]*\)\s*$/, '').trim();

  // Check if starts with a size prefix
  const sizeMatch = withoutCat.match(/^(small|medium|large)\b/i);
  const currentSize = sizeMatch
    ? sizeMatch[1].charAt(0).toUpperCase() + sizeMatch[1].slice(1).toLowerCase()
    : null;

  // Core item name without size prefix
  const baseCore = withoutCat.replace(/^(small|medium|large)\s+/i, '').trim().toLowerCase();

  // Find matching product in products database
  const matchedProd = products.find((p) => {
    const pName = (p.name || '').trim().toLowerCase();
    return pName === baseCore || pName === withoutCat.toLowerCase();
  });

  const isPizza =
    catInBracket === 'pizza' ||
    lower.includes('pizza') ||
    Boolean(matchedProd && (matchedProd.category === 'pizza' || (matchedProd.sizes && matchedProd.sizes.length > 0)));

  if (isPizza) {
    let availableSizes = ['Small', 'Medium', 'Large'];
    if (matchedProd && matchedProd.sizes && Array.isArray(matchedProd.sizes) && matchedProd.sizes.length > 0) {
      availableSizes = matchedProd.sizes.map((s) => s.label || s.name || s);
    }
    return {
      isPizza: true,
      currentSize,
      availableSizes
    };
  }

  if (catInBracket === 'shawarma' || lower.includes('shawarma')) {
    return {
      isPizza: false,
      isShawarma: true,
      currentSize,
      availableSizes: ['Small', 'Large']
    };
  }

  return null;
}

// Switch or toggle a size on an item string, preserving (Category) brackets
function toggleSizeOnItem(rawName, targetSize) {
  if (!rawName || !rawName.trim()) {
    return `${targetSize} Pizza (Pizza)`;
  }

  // Extract category in bracket if present, e.g. "(Pizza)"
  const catMatch = rawName.match(/\s*(\([^)]+\))\s*$/);
  let catBracket = catMatch ? catMatch[1] : '';

  // If no category bracket was present, determine default category bracket
  if (!catBracket) {
    if (rawName.toLowerCase().includes('shawarma')) {
      catBracket = '(Shawarma)';
    } else {
      catBracket = '(Pizza)';
    }
  }

  // Base without category in brackets
  const baseWithoutCat = rawName.replace(/\s*\([^)]*\)\s*$/, '').trim();

  // Check if currently starts with target size
  const sizeMatch = baseWithoutCat.match(/^(small|medium|large)\b/i);
  const currentSize = sizeMatch ? sizeMatch[1].toLowerCase() : null;
  const isCurrentlySame = currentSize === targetSize.toLowerCase();

  // Remove existing size prefix to get core name
  let baseCore = baseWithoutCat.replace(/^(small|medium|large)\s+/i, '').trim();
  if (!baseCore) {
    baseCore = catBracket.toLowerCase().includes('shawarma') ? 'Shawarma' : 'Pizza';
  }

  if (isCurrentlySame) {
    // Toggle off: return core name with category
    return `${baseCore}${catBracket ? ` ${catBracket}` : ''}`;
  } else {
    // Set to target size
    return `${targetSize} ${baseCore}${catBracket ? ` ${catBracket}` : ''}`;
  }
}

// Custom Searchable Dropdown with Categories & Disabled Selected Items
function ItemCombobox({
  value,
  onChange,
  allCatalogItems,
  disabledBaseNames,
  placeholder,
  hasDuplicate
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const hasSelectedValue = Boolean(value && value.trim());

  // Sync internal query when value prop changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on typed text
  const filteredOptions = useMemo(() => {
    if (!query || !query.trim() || hasSelectedValue) {
      return allCatalogItems;
    }
    const q = query.toLowerCase().trim();
    return allCatalogItems.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.displayName.toLowerCase().includes(q)
      );
    });
  }, [allCatalogItems, query, hasSelectedValue]);

  const handleSelect = (item) => {
    onChange(item.name);
    setQuery(item.name);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    if (hasSelectedValue) return;
    const newVal = e.target.value;
    setQuery(newVal);
    onChange(newVal);
    if (!isOpen) setIsOpen(true);
  };

  const handleClear = (e) => {
    if (e) e.stopPropagation();
    setQuery('');
    onChange('');
    setIsOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          readOnly={hasSelectedValue}
          onChange={handleInputChange}
          onClick={() => {
            if (hasSelectedValue) {
              setIsOpen((prev) => !prev);
            }
          }}
          onFocus={() => {
            if (!hasSelectedValue) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className={`w-full pl-9 pr-14 py-2 rounded-xl border text-xs sm:text-sm font-medium transition-all focus:outline-none ${
            hasDuplicate
              ? 'bg-red-50/50 border-red-300 text-red-950 focus:border-red-500'
              : hasSelectedValue
              ? 'bg-zinc-50/80 border-zinc-200 text-zinc-900 font-semibold cursor-pointer shadow-2xs select-none'
              : 'bg-zinc-50/60 border-zinc-200 text-zinc-900 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-2xs'
          }`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {hasSelectedValue ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-zinc-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors cursor-pointer"
              title="Clear item to select another"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            tabIndex={-1}
            title={isOpen ? 'Close list' : 'Browse list'}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-zinc-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto py-1 text-xs divide-y divide-zinc-100/70 custom-dropdown-scroll animate-in fade-in zoom-in-95 duration-100">
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-xs text-zinc-400 text-center font-medium">
              No matching menu item found. You can keep typing custom item name!
            </div>
          ) : (
            filteredOptions.map((item) => {
              const baseName = extractBaseName(item.name);
              const isDisabled = disabledBaseNames.has(baseName);

              return (
                <button
                  key={item.displayName}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                    isDisabled
                      ? 'opacity-40 bg-zinc-50/70 text-zinc-400 cursor-not-allowed'
                      : 'hover:bg-orange-50 hover:text-orange-700 text-zinc-800 cursor-pointer'
                  }`}
                >
                  <span className="font-semibold truncate text-xs sm:text-sm">
                    {item.name} <span className="text-zinc-400 font-normal text-xs">({item.category})</span>
                  </span>

                  {isDisabled ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded-full flex-shrink-0">
                      Already Added
                    </span>
                  ) : item.size ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex-shrink-0">
                      {item.size}
                    </span>
                  ) : (
                    <span className="text-[11px] text-zinc-400 font-medium flex-shrink-0">
                      {item.category}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function DealsManager({
  deals = [],
  familyDeal = null,
  products = [],
  categories = [],
  onRefresh
}) {
  // Local state for immediate optimistic star updates
  const [localFeaturedId, setLocalFeaturedId] = useState(() => {
    const list = [...deals];
    if (familyDeal && !list.some((d) => String(d.id) === String(familyDeal.id))) {
      list.unshift(familyDeal);
    }
    const feat = list.find((d) => d.featured === true || d.featured === 'true');
    return feat ? String(feat.id) : null;
  });

  useEffect(() => {
    const list = [...deals];
    if (familyDeal && !list.some((d) => String(d.id) === String(familyDeal.id))) {
      list.unshift(familyDeal);
    }
    const feat = list.find((d) => d.featured === true || d.featured === 'true');
    setLocalFeaturedId(feat ? String(feat.id) : null);
  }, [deals, familyDeal]);

  // Combine all deals and enforce single featured deal exclusivity
  const allDeals = useMemo(() => {
    const list = [...deals];
    if (familyDeal && !list.some((d) => String(d.id) === String(familyDeal.id))) {
      list.unshift({ ...familyDeal, dealType: 'family' });
    }
    return list.map((d) => ({
      ...d,
      featured: localFeaturedId ? String(d.id) === String(localFeaturedId) : false
    }));
  }, [deals, familyDeal, localFeaturedId]);

  const normalDeals = useMemo(() => allDeals.filter((d) => !isFamilyDeal(d)), [allDeals]);
  const familyDeals = useMemo(() => allDeals.filter((d) => isFamilyDeal(d)), [allDeals]);

  // Tab filter: 'all' | 'normal' | 'family'
  const [activeFilterTab, setActiveFilterTab] = useState('all');

  // Modal states
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [activeDeal, setActiveDeal] = useState(null);
  const [deleteConfirmDeal, setDeleteConfirmDeal] = useState(null);
  const [featureConfirmDeal, setFeatureConfirmDeal] = useState(null); // { deal, willBeFeatured: boolean }
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingFeature, setIsTogglingFeature] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form Fields
  const [dealType, setDealType] = useState('normal'); // 'normal' | 'family'
  const [dealName, setDealName] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [selectedImage, setSelectedImage] = useState('/assets/deal-1.png');

  // Item Rows: Array of { id, qty, name }
  const [itemRows, setItemRows] = useState([]);

  // Category Dictionary
  const categoryLabelMap = useMemo(() => {
    const map = {
      pizza: 'Pizza',
      burgers: 'Burgers',
      shawarma: 'Shawarma',
      sandwiches: 'Sandwiches',
      fries: 'Fries',
      wings: 'Hot Wings',
      nuggets: 'Nuggets',
      special: 'Special',
      drinks: 'Beverages',
      beverages: 'Beverages'
    };
    categories.forEach((c) => {
      if (c.id && c.label) map[c.id] = c.label;
    });
    return map;
  }, [categories]);

  // Comprehensive list of catalog items with category in bracket (base items only; size selected via pills)
  const allCatalogItems = useMemo(() => {
    const list = [];
    const seen = new Set();

    // 1. Database Products (base names only)
    products.forEach((p) => {
      if (p.name) {
        const cat = categoryLabelMap[p.category] || p.category || 'General';
        const pName = p.name.trim();
        const lower = pName.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          list.push({
            name: pName,
            category: cat,
            displayName: `${pName} (${cat})`
          });
        }
      }
    });

    // 2. Preset Sides, Beverages & Core Items
    const presets = [
      { name: 'Coke 500ml', category: 'Beverages' },
      { name: 'Coke 1L', category: 'Beverages' },
      { name: 'Coke 1.5L', category: 'Beverages' },
      { name: 'Sprite 500ml', category: 'Beverages' },
      { name: 'Sprite 1.5L', category: 'Beverages' },
      { name: 'Fanta 500ml', category: 'Beverages' },
      { name: 'Mineral Water', category: 'Beverages' },
      { name: 'Pizza', category: 'Pizza' },
      { name: 'Shawarma', category: 'Shawarma' },
      { name: 'Regular Fries', category: 'Fries' },
      { name: 'Loaded Fries', category: 'Special' },
      { name: '6 Nuggets', category: 'Nuggets' },
      { name: '10 Nuggets', category: 'Nuggets' },
      { name: '4 Pcs Wings', category: 'Hot Wings' },
      { name: '8 Pcs Wings', category: 'Hot Wings' }
    ];

    presets.forEach((pr) => {
      const lower = pr.name.toLowerCase().trim();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push({
          name: pr.name,
          category: pr.category,
          displayName: `${pr.name} (${pr.category})`
        });
      }
    });

    return list;
  }, [products, categoryLabelMap]);

  // Helper to auto-enrich any bare item name with (Category) if matched
  const enrichItemNameWithCategory = useMemo(() => {
    return (rawName) => {
      if (!rawName) return '';
      // If already has category in bracket, keep it
      if (/\([^)]+\)$/.test(rawName)) return rawName;

      const base = extractBaseName(rawName);
      const match = allCatalogItems.find((ci) => extractBaseName(ci.name) === base);
      if (match) {
        return `${rawName.trim()} (${match.category})`;
      }
      if (rawName.toLowerCase().includes('pizza')) {
        return `${rawName.trim()} (Pizza)`;
      }
      if (rawName.toLowerCase().includes('shawarma')) {
        return `${rawName.trim()} (Shawarma)`;
      }
      return rawName.trim();
    };
  }, [allCatalogItems]);

  // Open Edit Modal
  const openEdit = (deal) => {
    setActiveDeal(deal);
    setModalMode('edit');
    const isFam = isFamilyDeal(deal);
    setDealType(isFam ? 'family' : 'normal');
    setDealName(deal.name || '');
    setPriceInput(deal.price || '');
    setDescriptionInput(deal.description || '');
    setSelectedImage(deal.image || (isFam ? '/assets/deal-family.png' : '/assets/deal-1.png'));

    const parsed = (deal.includes || []).map((str, idx) =>
      parseItemString(str, idx)
    );

    setItemRows(
      parsed.length > 0
        ? parsed
        : [{ id: `item-${Date.now()}`, qty: 1, name: '' }]
    );
  };

  // Open Create Modal
  const openCreate = (initialType = 'normal') => {
    setActiveDeal(null);
    setModalMode('create');
    setDealType(initialType);

    if (initialType === 'family') {
      const famCount = familyDeals.length + 1;
      setDealName(`Family Deal ${famCount}`);
      setDescriptionInput('One big combo bundle crafted for the entire family — packed with burgers, pizza, shawarmas, and chilled beverages.');
      setSelectedImage('/assets/deal-family.png');
    } else {
      const normCount = normalDeals.length + 1;
      setDealName(`Deal ${normCount}`);
      setDescriptionInput('');
      setSelectedImage(`/assets/deal-${Math.min(normCount, 11)}.png`);
    }

    setPriceInput('');
    // Start with 2 clean empty rows
    setItemRows([
      { id: `item-${Date.now()}-1`, qty: 1, name: '' },
      { id: `item-${Date.now()}-2`, qty: 1, name: '' }
    ]);
  };

  const closeModal = () => {
    setModalMode(null);
    setActiveDeal(null);
    setDescriptionInput('');
    setItemRows([]);
  };

  // Item Rows Management
  const handleSetItemQtyDirect = (index, val) => {
    setItemRows((prev) => {
      const updated = [...prev];
      if (val === '') {
        updated[index] = { ...updated[index], qty: '' };
      } else {
        const parsed = parseInt(val, 10);
        updated[index] = { ...updated[index], qty: isNaN(parsed) ? 1 : Math.max(1, parsed) };
      }
      return updated;
    });
  };

  const handleItemNameChange = (index, text) => {
    setItemRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name: text };
      return updated;
    });
  };

  const handleToggleItemSize = (index, targetSize) => {
    setItemRows((prev) => {
      const updated = [...prev];
      const currentName = updated[index]?.name || '';
      updated[index] = {
        ...updated[index],
        name: toggleSizeOnItem(currentName, targetSize)
      };
      return updated;
    });
  };

  const handleAddRow = () => {
    setItemRows((prev) => [
      ...prev,
      { id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, qty: 1, name: '' }
    ]);
  };

  const handleRemoveRow = (index) => {
    setItemRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Image Upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const data = new FormData();
    data.append('image', file);

    try {
      const res = await fetch(apiUrl('/api/upload'), {
        method: 'POST',
        body: data
      });
      const result = await res.json();
      if (res.ok && result.url) {
        setSelectedImage(result.url);
      } else {
        alert(result.error || 'Failed to upload image');
      }
    } catch {
      alert('Error uploading image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Identify duplicates in current rows
  const duplicateIndices = useMemo(() => {
    const counts = {};
    const dupes = new Set();

    itemRows.forEach((it, idx) => {
      const base = extractBaseName(it.name);
      if (base) {
        if (counts[base] !== undefined) {
          dupes.add(counts[base]);
          dupes.add(idx);
        } else {
          counts[base] = idx;
        }
      }
    });

    return dupes;
  }, [itemRows]);

  // Save Deal
  const handleSave = async (e) => {
    e.preventDefault();
    if (!dealName.trim()) {
      alert('Please enter a Deal Name');
      return;
    }

    if (!priceInput || isNaN(Number(priceInput)) || Number(priceInput) <= 0) {
      alert('Please enter a valid price (e.g. 850)');
      return;
    }

    // Filter valid non-empty items and clean category brackets
    const validItems = itemRows
      .filter((it) => it.name && it.name.trim().length > 0)
      .map((it) => ({
        ...it,
        qty: Number(it.qty) >= 1 ? Number(it.qty) : 1,
        name: cleanDealInclusions(it.name.trim())
      }));

    if (validItems.length === 0) {
      alert('Please write at least 1 item name (e.g. Chicken Shawarma)');
      return;
    }

    // Check if duplicates exist
    if (duplicateIndices.size > 0) {
      alert(
        'Duplicate items detected! Please remove duplicate items and increase quantity on the existing item instead.'
      );
      return;
    }

    setIsSaving(true);
    const formattedIncludes = validItems.map((it) => `${it.qty} ${it.name}`);
    const generatedDescription = formattedIncludes.join(' + ');
    const finalDescription = descriptionInput.trim() || generatedDescription;

    const numMatch = dealName.match(/\d+/);
    const numberStr = numMatch ? String(numMatch[0]).padStart(2, '0') : undefined;

    const payload = {
      name: dealName.trim(),
      number: numberStr,
      category: 'deals',
      dealType: dealType,
      price: Number(priceInput),
      image: selectedImage || (dealType === 'family' ? '/assets/deal-family.png' : '/assets/deal-1.png'),
      includes: formattedIncludes,
      description: finalDescription,
      tag: dealType === 'family' ? 'Family Bundle' : '',
      featured: modalMode === 'edit' && activeDeal ? !!activeDeal.featured : false
    };

    try {
      let res;
      if (modalMode === 'edit' && activeDeal) {
        res = await fetch(apiUrl(`/api/deals/${activeDeal.id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(apiUrl('/api/deals'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        closeModal();
        if (onRefresh) onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save deal');
      }
    } catch {
      alert('Error connecting to server');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Featured Deal with confirmation
  const handleInitiateToggleFeatured = (deal) => {
    setFeatureConfirmDeal({
      deal,
      willBeFeatured: !deal.featured
    });
  };

  const handleConfirmToggleFeatured = async () => {
    if (!featureConfirmDeal || isTogglingFeature) return;
    const { deal, willBeFeatured } = featureConfirmDeal;
    setIsTogglingFeature(true);
    const targetId = String(deal.id);

    // Immediate optimistic update
    setLocalFeaturedId(willBeFeatured ? targetId : null);
    setFeatureConfirmDeal(null);

    try {
      const res = await fetch(apiUrl(`/api/deals/${deal.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: willBeFeatured })
      });
      if (res.ok) {
        if (onRefresh) await onRefresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to update featured deal');
        if (onRefresh) await onRefresh();
      }
    } catch (err) {
      console.error(err);
      alert('Error updating featured deal');
      if (onRefresh) await onRefresh();
    } finally {
      setIsTogglingFeature(false);
    }
  };

  // Delete Deal
  const handleDeleteDeal = async () => {
    if (!deleteConfirmDeal) return;
    setIsDeleting(true);

    try {
      const res = await fetch(apiUrl(`/api/deals/${deleteConfirmDeal.id}`), {
        method: 'DELETE'
      });

      if (res.ok) {
        setDeleteConfirmDeal(null);
        if (modalMode) closeModal();
        if (onRefresh) onRefresh();
      } else {
        alert('Failed to delete deal');
      }
    } catch {
      alert('Error deleting deal');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered list for display
  const displayedDeals = useMemo(() => {
    if (activeFilterTab === 'normal') return normalDeals;
    if (activeFilterTab === 'family') return familyDeals;
    return allDeals;
  }, [activeFilterTab, allDeals, normalDeals, familyDeals]);

  return (
    <div className="space-y-6">
      
      {/* Top Header & Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-2xl uppercase tracking-wide text-zinc-900">
              Manage Deals & Bundles
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200">
              {allDeals.length} Active
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Write your deal items, set quantities, and customize bundle pricing with ease.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => openCreate('normal')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Normal Deal</span>
          </button>

          <button
            type="button"
            onClick={() => openCreate('family')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Family Deal</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveFilterTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
            activeFilterTab === 'all'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200'
          }`}
        >
          All Deals ({allDeals.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilterTab('normal')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
            activeFilterTab === 'normal'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Normal Deals ({normalDeals.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilterTab('family')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
            activeFilterTab === 'family'
              ? 'bg-amber-500 text-zinc-950 shadow-xs font-extrabold'
              : 'bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Family Deals ({familyDeals.length})</span>
        </button>
      </div>

      {/* Deals Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayedDeals.map((deal) => {
          const isFam = isFamilyDeal(deal);
          const isFeatured = !!deal.featured;
          return (
            <div
              key={deal.id}
              className={`bg-white rounded-2xl border shadow-2xs hover:shadow-md p-5 flex flex-col justify-between space-y-4 transition-all duration-200 ${
                isFeatured
                  ? 'border-amber-400 ring-2 ring-amber-400/40 bg-gradient-to-b from-amber-50/25 to-white'
                  : isFam
                  ? 'border-amber-300 ring-1 ring-amber-400/30'
                  : 'border-zinc-200 hover:border-orange-300'
              }`}
            >
              {/* Card Top: Badge & Price & Star */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {isFam ? (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-zinc-950 font-extrabold text-[11px] uppercase tracking-wider shadow-2xs">
                        {deal.name ? deal.name.toUpperCase() : `FAMILY DEAL ${deal.number || ''}`}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-orange-600 text-white font-extrabold text-[11px] uppercase tracking-wider shadow-2xs">
                        DEAL {deal.number || deal.id.replace('deal-', '')}
                      </span>
                    )}

                    {/* Star Icon for Featured Deal */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInitiateToggleFeatured(deal);
                      }}
                      disabled={isTogglingFeature}
                      title={isFeatured ? 'Featured Deal (Showing on Top) — Click to remove' : 'Set as Featured Deal on Top'}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                        isFeatured
                          ? 'bg-amber-100 border-amber-400 text-amber-500 shadow-xs ring-1 ring-amber-400/40'
                          : 'bg-zinc-50 hover:bg-amber-50 border-zinc-200 hover:border-amber-300 text-zinc-400 hover:text-amber-500'
                      }`}
                    >
                      <Star
                        className={`w-3.5 h-3.5 transition-transform ${
                          isFeatured
                            ? 'fill-amber-400 text-amber-500 scale-110'
                            : 'text-zinc-400 hover:text-amber-500'
                        }`}
                      />
                    </button>
                  </div>

                  <span
                    className={`font-sans text-xl font-bold shrink-0 ${
                      isFam ? 'text-amber-600' : 'text-orange-600'
                    }`}
                  >
                    Rs. {formatPrice(deal.price)}
                  </span>
                </div>

                {/* Deal Image & Items List */}
                <div className="flex items-start gap-3.5 pt-1">
                  <img
                    src={deal.image}
                    alt={deal.name}
                    className={`w-20 h-20 object-contain rounded-xl p-1.5 border flex-shrink-0 shadow-2xs ${
                      isFam ? 'bg-amber-50/50 border-amber-200' : 'bg-zinc-50 border-zinc-200'
                    }`}
                    onError={(e) => {
                      e.target.src = isFam ? '/assets/deal-family.png' : '/assets/deal-1.png';
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-zinc-900 mb-1 truncate">
                      {deal.name || (isFam ? `Family Deal ${deal.number || ''}` : `Deal ${deal.number || ''}`)}
                    </h4>
                    {deal.description && deal.description !== (deal.includes || []).join(' + ') && (
                      <p className="text-[11px] text-zinc-500 line-clamp-2 mb-1.5 leading-snug">
                        {deal.description}
                      </p>
                    )}
                    <ul className="space-y-1 text-xs text-zinc-700">
                      {(deal.includes || []).map((it, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 text-zinc-600">
                          <Check
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                              isFam ? 'text-amber-600' : 'text-orange-600'
                            }`}
                          />
                          <span className="truncate">{cleanDealInclusions(it)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Edit & Delete */}
              <div className="flex items-center gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => openEdit(deal)}
                  className="flex-1 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 hover:text-zinc-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-orange-600" />
                  <span>Edit Deal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteConfirmDeal(deal)}
                  className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 hover:text-red-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Delete this deal"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          );
        })}

        {displayedDeals.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-zinc-300">
            <Flame className="w-10 h-10 text-orange-400 mx-auto mb-2" />
            <h4 className="font-display text-lg uppercase text-zinc-800">No Deals In This Category</h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
              Use the "+ Normal Deal" or "+ Family Deal" buttons at the top to create a deal.
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmDeal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative bg-white border border-zinc-200 rounded-3xl p-6 sm:p-7 max-w-md w-full text-zinc-900 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="font-display text-xl uppercase tracking-wide text-center text-zinc-900">
              Delete {deleteConfirmDeal.name || `Deal ${deleteConfirmDeal.number}`}?
            </h3>

            <p className="text-xs text-zinc-600 text-center mt-2 mb-4 leading-relaxed">
              Are you sure you want to delete this deal (<strong>Rs. {formatPrice(deleteConfirmDeal.price)}</strong>)? It will be removed from your website and mobile app.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmDeal(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteDeal}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow cursor-pointer flex items-center justify-center gap-2"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature Confirmation Modal */}
      {featureConfirmDeal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative bg-white border border-zinc-200 rounded-3xl p-6 sm:p-7 max-w-md w-full text-zinc-900 shadow-2xl animate-in zoom-in-95 duration-150">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                featureConfirmDeal.willBeFeatured
                  ? 'bg-amber-100 text-amber-600 ring-4 ring-amber-50'
                  : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              <Star
                className={`w-6 h-6 ${
                  featureConfirmDeal.willBeFeatured ? 'fill-amber-400 text-amber-500' : 'text-zinc-500'
                }`}
              />
            </div>

            <h3 className="font-display text-xl uppercase tracking-wide text-center text-zinc-900">
              {featureConfirmDeal.willBeFeatured ? 'Set as Featured Deal?' : 'Remove from Featured?'}
            </h3>

            <p className="text-xs text-zinc-600 text-center mt-2 mb-5 leading-relaxed">
              {featureConfirmDeal.willBeFeatured ? (
                <>
                  Set <strong>{featureConfirmDeal.deal.name || `Deal ${featureConfirmDeal.deal.number}`}</strong> as the top featured deal on the customer app? Any previously featured deal will be automatically unfeatured.
                </>
              ) : (
                <>
                  Remove <strong>{featureConfirmDeal.deal.name || `Deal ${featureConfirmDeal.deal.number}`}</strong> from the top featured deal position?
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isTogglingFeature}
                onClick={() => setFeatureConfirmDeal(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isTogglingFeature}
                onClick={handleConfirmToggleFeatured}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${
                  featureConfirmDeal.willBeFeatured
                    ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950'
                    : 'bg-zinc-800 hover:bg-zinc-900 text-white'
                }`}
              >
                {isTogglingFeature ? (
                  <span>Updating...</span>
                ) : featureConfirmDeal.willBeFeatured ? (
                  <>
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>Yes, Set Featured</span>
                  </>
                ) : (
                  <span>Yes, Remove</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* DEAL CREATION & EDITING MODAL */}
      {/* ==================================================================== */}
      {modalMode && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative bg-white border border-zinc-200 rounded-3xl p-6 sm:p-7 max-w-xl w-full text-zinc-900 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 flex-shrink-0">
              <div>
                <h3 className="font-display text-2xl uppercase tracking-wide text-zinc-900">
                  {modalMode === 'create'
                    ? dealType === 'family'
                      ? 'New Family Deal'
                      : 'New Combo Deal'
                    : `Edit ${activeDeal?.name || 'Deal'}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto py-5 space-y-5 text-xs pr-1 custom-dropdown-scroll">
              
              {/* 1. Deal Name & Price Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Deal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={dealName}
                    onChange={(e) => setDealName(e.target.value)}
                    placeholder={dealType === 'family' ? 'e.g. Family Deal 1' : 'e.g. Deal 1'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 font-bold focus:outline-none focus:border-orange-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label
                    className={`block font-bold uppercase tracking-wider mb-1 ${
                      dealType === 'family' ? 'text-amber-700' : 'text-orange-600'
                    }`}
                  >
                    Price (<span className="normal-case">Rs.</span>) *
                  </label>
                  <input
                    type="number"
                    required
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    placeholder="e.g. 850"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-white border-2 font-bold text-sm focus:outline-none shadow-2xs ${
                      dealType === 'family'
                        ? 'border-amber-300 text-amber-900 focus:border-amber-500'
                        : 'border-orange-300 text-zinc-900 focus:border-orange-500'
                    }`}
                  />
                </div>
              </div>

              {/* 2. Deal Description (Optional) */}
              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Deal Description <span className="text-zinc-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder={
                    dealType === 'family'
                      ? 'e.g. One big combo bundle crafted for the entire family — packed with burgers, pizza, shawarmas, and chilled beverages.'
                      : 'e.g. Delicious combo bundle with crispy burgers and chilled drink.'
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-zinc-300 text-zinc-900 font-medium text-xs focus:outline-none focus:border-orange-500 shadow-2xs resize-none placeholder-zinc-400"
                />
              </div>

              {/* 3. ROW-BY-ROW ITEMS BUILDER WITH CATEGORIES & SELECTION DISABLE */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 sm:p-3.5 space-y-2">
                <div className="px-0.5">
                  <span className="font-bold text-xs text-zinc-800 uppercase tracking-wider">
                    Included Items ({itemRows.filter((it) => it.name && it.name.trim()).length})
                  </span>
                </div>

                {/* List of Item Cards */}
                <div className="space-y-2.5">
                  {itemRows.map((item, idx) => {
                    // Set of base names selected in OTHER rows
                    const disabledBaseNames = new Set(
                      itemRows
                        .filter((_, i) => i !== idx)
                        .map((r) => extractBaseName(r.name))
                        .filter(Boolean)
                    );

                    const isDup = duplicateIndices.has(idx);
                    const sizeInfo = getItemSizeInfo(item.name, products);

                    return (
                      <div
                        key={item.id}
                        className={`bg-white p-3 sm:p-3.5 rounded-2xl border shadow-2xs transition-all space-y-2.5 ${
                          isDup
                            ? 'border-red-400 bg-red-50/20 ring-2 ring-red-200'
                            : 'border-zinc-200/90 hover:border-zinc-300'
                        }`}
                      >
                        {/* Top Header Row: Item Badge (Left) + Qty & Delete (Right) */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 font-bold text-[11px] select-none">
                            Item #{idx + 1}
                          </span>

                          <div className="flex items-center gap-2">
                            {/* Qty Stepper / Input */}
                            <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-0.5 shadow-2xs">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase">
                                Qty:
                              </span>
                              <input
                                type="number"
                                min="1"
                                max="99"
                                value={item.qty}
                                onChange={(e) => handleSetItemQtyDirect(idx, e.target.value)}
                                onBlur={() => {
                                  if (!item.qty || Number(item.qty) < 1) {
                                    handleSetItemQtyDirect(idx, 1);
                                  }
                                }}
                                className="w-7 text-center font-bold text-xs text-zinc-900 bg-transparent focus:outline-none"
                              />
                            </div>

                            {/* Remove Action */}
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              disabled={itemRows.length <= 1}
                              className="p-1 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Next Line: Full-width Searchbar Combobox */}
                        <div className="w-full">
                          <ItemCombobox
                            value={item.name}
                            onChange={(val) => handleItemNameChange(idx, val)}
                            allCatalogItems={allCatalogItems}
                            disabledBaseNames={disabledBaseNames}
                            hasDuplicate={isDup}
                            placeholder="Search or select food item (e.g. Zinger Burger)..."
                          />
                        </div>

                        {/* Quick Size Selector Pills (if multi-size item selected) */}
                        {sizeInfo && (
                          <div className="flex items-center justify-end gap-1.5 pt-0.5 pr-1">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Size:
                            </span>
                            <div className="inline-flex p-0.5 bg-zinc-100 rounded-lg border border-zinc-200 shadow-2xs">
                              {sizeInfo.availableSizes.map((sz) => {
                                const isSelected =
                                  sizeInfo.currentSize &&
                                  sizeInfo.currentSize.toLowerCase() === sz.toLowerCase();
                                return (
                                  <button
                                    key={sz}
                                    type="button"
                                    onClick={() => handleToggleItemSize(idx, sz)}
                                    className={`px-2 py-0.5 text-[11px] rounded font-bold transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-orange-500 text-white shadow-2xs'
                                        : 'text-zinc-600 hover:text-zinc-950 hover:bg-white/80'
                                    }`}
                                  >
                                    {sz}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Duplicate Alert Notice */}
                        {isDup && (
                          <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium pt-0.5">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>
                              This item is already added! Increase quantity above instead.
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Another Item Button */}
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="w-full py-2.5 rounded-xl border border-dashed border-zinc-300 hover:border-orange-400 bg-white hover:bg-orange-50/40 text-zinc-700 hover:text-orange-700 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Item</span>
                </button>
              </div>

              {/* 4. Compact Image Selection */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-3 sm:p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider">
                    Deal Image
                  </label>
                  <label className="cursor-pointer text-orange-600 hover:text-orange-700 font-bold text-[11px] uppercase flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="w-12 h-12 rounded-xl object-contain bg-zinc-50 border border-zinc-200 p-1 flex-shrink-0"
                    onError={(e) => {
                      e.target.src = dealType === 'family' ? '/assets/deal-family.png' : '/assets/deal-1.png';
                    }}
                  />

                  <select
                    value={selectedImage}
                    onChange={(e) => setSelectedImage(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-orange-500"
                  >
                    {PRESET_DEAL_IMAGES.map((img) => (
                      <option key={img.src} value={img.src}>
                        {img.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-200 flex-shrink-0">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving || duplicateIndices.size > 0}
                  className={`px-7 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                    dealType === 'family'
                      ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950 font-extrabold'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                  }`}
                >
                  {isSaving ? 'Saving...' : 'Save Deal'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
