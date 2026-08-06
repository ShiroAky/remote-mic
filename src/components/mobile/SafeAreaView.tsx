import { ReactNode, useEffect } from 'react';

interface SafeAreaViewProps {
  children: ReactNode;
  className?: string;
}

export function SafeAreaView({ children, className = '' }: SafeAreaViewProps) {
  useEffect(() => {
    const preventTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) return;
      const target = e.target as HTMLElement;
      if (!target.closest('.allow-scroll')) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventTouch, { passive: false });
    return () => {
      document.removeEventListener('touchmove', preventTouch);
    };
  }, []);

  return (
    <div
      className={`
        flex flex-col
        w-full h-dvh
        overflow-hidden
        select-none
        touch-none
        bg-slate-900 text-white
        ${className}
      `}
    >
      {children}
    </div>
  );
}