import type { ReactNode } from 'react';

type NeonCardProps = {
  children: ReactNode;
  className?: string;
  tone?: 'green' | 'red' | 'blue' | 'violet' | 'yellow' | 'neutral';
};

const toneMap = {
  green: 'border-forge-green/30 shadow-green',
  red: 'border-forge-red/30 shadow-red',
  blue: 'border-forge-blue/30 shadow-blue',
  violet: 'border-forge-violet/30 shadow-violet',
  yellow: 'border-forge-yellow/30 shadow-[0_0_24px_rgba(255,228,92,0.18)]',
  neutral: 'border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.04)]',
};

export function NeonCard({ children, className = '', tone = 'neutral' }: NeonCardProps) {
  return (
    <section className={`rounded-lg border bg-forge-panel/88 p-4 backdrop-blur ${toneMap[tone]} ${className}`}>
      {children}
    </section>
  );
}

