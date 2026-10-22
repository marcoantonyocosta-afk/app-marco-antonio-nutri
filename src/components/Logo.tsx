import React from 'react';
import { Leaf } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', subtitle }) => {
  const sizeClasses = {
    sm: { icon: 'w-6 h-6', text: 'text-xl', badge: 'p-1.5' },
    md: { icon: 'w-8 h-8', text: 'text-2xl', badge: 'p-2' },
    lg: { icon: 'w-10 h-10', text: 'text-3xl', badge: 'p-2.5' }
  }[size];

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <div className="flex items-center gap-2.5">
        <div className={`bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl text-white shadow-md shadow-emerald-500/20 flex items-center justify-center ${sizeClasses.badge}`}>
          <Leaf className={`${sizeClasses.icon} stroke-[2.2]`} />
        </div>
        <div className="flex items-baseline">
          <span className={`font-extrabold tracking-tight text-slate-900 ${sizeClasses.text}`}>
            Nutri
          </span>
          <span className={`font-black tracking-tight text-emerald-600 ${sizeClasses.text}`}>
            Fit
          </span>
        </div>
      </div>
      {subtitle && (
        <p className="text-xs font-medium text-emerald-800/60 tracking-wide uppercase mt-0.5">
          {subtitle}
        </p>
      )}
    </div>
  );
};
