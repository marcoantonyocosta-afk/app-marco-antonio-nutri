import React from 'react';
import { Leaf } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
  align?: 'left' | 'center';
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', subtitle, align = 'center' }) => {
  const sizeClasses = {
    sm: { icon: 'w-5 h-5', text: 'text-lg', badge: 'w-8 h-8 rounded-lg' },
    md: { icon: 'w-6 h-6', text: 'text-xl', badge: 'w-10 h-10 rounded-xl' },
    lg: { icon: 'w-7 h-7', text: 'text-2xl', badge: 'w-12 h-12 rounded-2xl' }
  }[size];

  const alignClass = align === 'left' ? 'items-start text-left' : 'items-center text-center';

  return (
    <div className={`flex flex-col ${alignClass}`}>
      <div className="flex items-center gap-3">
        <div className={`bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center shrink-0 ${sizeClasses.badge}`}>
          <Leaf className={`${sizeClasses.icon} stroke-[2.2]`} />
        </div>
        <div className="flex flex-col leading-tight">
          <div className="flex items-baseline">
            <span className={`font-black tracking-tight text-gray-900 ${sizeClasses.text}`}>
              Nutri
            </span>
            <span className={`font-black tracking-tight text-emerald-600 ${sizeClasses.text}`}>
              Fit
            </span>
          </div>
          {subtitle && (
            <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
