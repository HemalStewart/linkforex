import React from 'react';

type YesNo = 'yes' | 'no';

type ToggleSwitchProps = {
  label: string;
  value: YesNo;
  onChange: (value: YesNo) => void;
};

export default function ToggleSwitch({
  label,
  value,
  onChange,
}: ToggleSwitchProps) {
  const enabled = value === 'yes';

  const handleToggle = () => {
    onChange(enabled ? 'no' : 'yes');
  };

  return (
    <div className="flex items-center justify-between w-full">
      {/* Label */}
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </span>

      {/* Toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${enabled
            ? 'bg-teal-500 shadow-md shadow-teal-500/30'
            : 'bg-slate-300 dark:bg-slate-600'
          }`}
      >
        {/* Thumb */}
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${enabled ? 'translate-x-5' : 'translate-x-1'
            }`}
        />
      </button>
    </div>
  );
}