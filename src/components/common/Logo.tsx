import React from 'react';
import { Leaf } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', subtitle, className = '' }) => {
  const sizeClasses = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center gap-1.5 select-none font-semibold tracking-tight text-[#1C1C1A]">
        <span className={`font-bold ${sizeClasses[size]} tracking-tight`}>
          Meats <span className="text-[#C0573E] font-extrabold mx-0.5">&amp;</span> Plants
        </span>
        <Leaf
          size={iconSizes[size]}
          className="text-[#2F7D4F] fill-[#2F7D4F]/20 stroke-[2.2] -mt-0.5"
        />
      </div>
      {subtitle && (
        <span className="text-[11px] font-medium text-[#6B6B66] tracking-normal -mt-0.5">
          {subtitle}
        </span>
      )}
    </div>
  );
};
