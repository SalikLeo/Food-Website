import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  children,
  placeholder = 'Select...',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  name = '',
  disabled = false,
  align = 'left',
  isDark = undefined
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Auto-detect dark mode if not explicitly provided
  const darkMode = isDark !== undefined
    ? isDark
    : (typeof document !== 'undefined' && (
        document.documentElement.classList.contains('dark') ||
        document.body.classList.contains('dark') ||
        Boolean(document.querySelector('.dark'))
      ));

  // Extract options from props or children if children is passed
  let parsedOptions = [];
  if (options && options.length > 0) {
    parsedOptions = options.map(opt => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          value: opt.value !== undefined ? opt.value : opt.label,
          label: opt.label !== undefined ? opt.label : String(opt.value),
          disabled: opt.disabled || false
        };
      }
      return { value: opt, label: String(opt), disabled: false };
    });
  } else if (children) {
    React.Children.forEach(children, child => {
      if (React.isValidElement(child)) {
        parsedOptions.push({
          value: child.props.value !== undefined ? child.props.value : child.props.children,
          label: child.props.children || child.props.value,
          disabled: child.props.disabled || false
        });
      }
    });
  }

  const selectedOption = parsedOptions.find(opt => String(opt.value) === String(value));
  const displayLabel = selectedOption
    ? selectedOption.label
    : (value !== undefined && value !== null && value !== '' ? String(value) : placeholder);

  // Close on outside click or escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (opt) => {
    if (opt.disabled) return;
    setIsOpen(false);
    if (typeof onChange === 'function') {
      const syntheticEvent = {
        target: {
          name: name || '',
          value: opt.value
        }
      };
      onChange(syntheticEvent);
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-1.5 focus:outline-none transition-all cursor-pointer select-none active:scale-[0.98] ${buttonClassName}`}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 opacity-70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 z-50 min-w-[130px] max-w-[280px] max-h-60 overflow-y-auto rounded-xl shadow-xl border p-1 text-xs custom-dropdown-scroll animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${
            darkMode
              ? 'bg-[#181820] border-zinc-700 text-zinc-100 shadow-2xl'
              : 'bg-white border-zinc-200 text-zinc-800'
          } ${menuClassName}`}
        >
          {parsedOptions.map((opt, idx) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value ?? idx}
                type="button"
                disabled={opt.disabled}
                onClick={() => handleSelect(opt)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-orange-500 text-white font-bold shadow-xs'
                    : darkMode
                    ? 'text-zinc-200 hover:bg-white/10 hover:text-white'
                    : 'text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900'
                } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
