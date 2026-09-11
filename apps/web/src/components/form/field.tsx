'use client';

import { useId, useState } from 'react';
import { Icon } from '@/components/icon';

/*
 * Outlined floating-label fields — the Hub's form contract:
 * empty + unfocused  → label sits centered on the border, placeholder inside
 * filled or focused  → label floats above the border (green when focused)
 * errors             → red border + red label + red helper text
 */

const STATE_BORDER = {
  normal: 'border-slate-300 focus:border-a2sv-500 focus:ring-2 focus:ring-a2sv-100',
  error: 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100',
} as const;

function FieldFooter({ error, hint }: { error?: string | null; hint?: string }) {
  if (error) return <p className="field-error">{error}</p>;
  if (hint) return <p className="mt-1 text-xs text-slate-400">{hint}</p>;
  return null;
}

export interface OutlinedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className' | 'id'> {
  label: string;
  error?: string | null;
  hint?: string;
  id?: string;
}

export function OutlinedInput({
  label,
  required,
  error,
  hint,
  id: idProp,
  value,
  disabled,
  onFocus,
  onBlur,
  ...rest
}: OutlinedInputProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [focused, setFocused] = useState(false);
  const filled = typeof value === 'string' && value.length > 0;
  const floated = focused || filled;

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          value={value}
          disabled={disabled}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className={`w-full rounded-xl border bg-white px-3.5 pb-2.5 pt-6 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 ${
            error ? STATE_BORDER.error : STATE_BORDER.normal
          } ${disabled ? 'cursor-not-allowed bg-slate-50 text-slate-400' : ''}`}
          {...rest}
        />
        <label
          htmlFor={id}
          className={`pointer-events-none absolute left-3.5 bg-white px-1 transition-all ${
            floated ? 'top-2 text-xs font-semibold' : 'top-1/2 -translate-y-1/2 text-sm font-normal'
          } ${
            error
              ? 'text-red-500'
              : focused
                ? 'text-a2sv-600'
                : floated
                  ? 'text-slate-500'
                  : 'text-slate-400'
          }`}
        >
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      </div>
      <FieldFooter error={error} hint={hint} />
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface OutlinedSelectProps {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string | null;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export function OutlinedSelect({
  label,
  options,
  value,
  onChange,
  required,
  error,
  hint,
  placeholder = 'Select…',
  disabled,
  id: idProp,
  name,
}: OutlinedSelectProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [focused, setFocused] = useState(false);
  const floated = focused || value !== '';

  return (
    <div>
      <div className="relative">
        <select
          id={id}
          name={name}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full appearance-none rounded-xl border bg-white px-3.5 pb-2.5 pt-6 text-sm font-medium outline-none transition ${
            value === '' ? 'text-slate-400' : 'text-slate-800'
          } ${error ? STATE_BORDER.error : STATE_BORDER.normal} ${
            disabled ? 'cursor-not-allowed bg-slate-50 text-slate-400' : ''
          }`}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label
          htmlFor={id}
          className={`pointer-events-none absolute left-3.5 bg-white px-1 transition-all ${
            floated ? 'top-2 text-xs font-semibold' : 'top-1/2 -translate-y-1/2 text-sm font-normal'
          } ${
            error
              ? 'text-red-500'
              : focused
                ? 'text-a2sv-600'
                : floated
                  ? 'text-slate-500'
                  : 'text-slate-400'
          }`}
        >
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
        <Icon
          name="chevronDown"
          className="pointer-events-none absolute right-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400"
        />
      </div>
      <FieldFooter error={error} hint={hint} />
    </div>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`inline-flex items-center gap-2.5 text-sm font-medium text-slate-700 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        className="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      {label}
    </label>
  );
}