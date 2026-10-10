import React from 'react';

/* Form controls — 8px radius inputs, labeled + described for a11y. */

const inputBase =
  'w-full rounded-(--radius-input) border border-white/12 bg-void px-3.5 py-2.5 text-base text-pure placeholder:text-fog transition-colors duration-200 focus:border-cyan-signal/60 focus:outline-none focus-visible:outline-none disabled:opacity-50';

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, error, hint, children, className = '' }: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="label-mono text-ash">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-fog">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-orchid-bloom">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...props }, ref) {
    return <input ref={ref} className={`${inputBase} ${className}`} {...props} />;
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = '', children, ...props }, ref) {
    return (
      <select ref={ref} className={`${inputBase} appearance-none ${className}`} {...props}>
        {children}
      </select>
    );
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = '', ...props }, ref) {
    return <textarea ref={ref} rows={3} className={`${inputBase} resize-y ${className}`} {...props} />;
  },
);
