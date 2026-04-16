import React from 'react';

// Polymorphism: Badge component that adapt to status categories
interface BadgeProps {
  label: string;
  type?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'xs' | 'sm';
  className?: string;
}

export const StatusBadge: React.FC<BadgeProps> = ({ label, type = 'neutral', size = 'xs', className = '' }) => {
  const styles = {
    success: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    warning: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    error: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    info: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
    neutral: 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-white/5 dark:text-slate-400 dark:border-white/10'
  };

  return (
    <span className={`px-3 py-1 rounded-xl font-bold uppercase tracking-widest border transition-all ${styles[type]} ${size === 'xs' ? 'text-[9px]' : 'text-[10px]'} ${className}`}>
      {label}
    </span>
  );
};

// Inheritance: PremiumCard inherits the base dashboard shadow and glass styles
interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  actions?: React.ReactNode;
}

export const PremiumCard: React.FC<CardProps> = ({ children, title, subtitle, className = '', actions }) => {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col ${className}`}>
      {(title || actions) && (
        <div className="px-10 py-8 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 flex items-center justify-between">
          <div>
            {title && <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-[0.2em]">{title}</h3>}
            {subtitle && <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{subtitle}</p>}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className="p-0">
        {children}
      </div>
    </div>
  );
};

// Polymorphism: IconContainer adapts to color themes
export const IconBox: React.FC<{ icon: string; color: string; className?: string }> = ({ icon, color, className = '' }) => {
    // Dynamic mapping for color inheritance
    const colorMap: Record<string, string> = {
        emerald: 'bg-emerald-500/10 text-emerald-600',
        amber: 'bg-amber-500/10 text-amber-600',
        rose: 'bg-rose-500/10 text-rose-600',
        indigo: 'bg-indigo-500/10 text-indigo-600',
        slate: 'bg-slate-500/10 text-slate-600'
    };

    return (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${colorMap[color] || colorMap.emerald} ${className}`}>
            <i className={`${icon} text-lg`}></i>
        </div>
    );
};
