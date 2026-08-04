import { useState, useEffect } from 'react';

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function useSafeAreaInsets(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    const updateInsets = () => {
      // Creamos un elemento temporal para medir las variables CSS env()
      const div = document.createElement('div');
      div.style.setProperty('position', 'fixed');
      div.style.setProperty('top', '0');
      div.style.setProperty('left', '0');
      div.style.setProperty('padding-top', 'env(safe-area-inset-top)');
      div.style.setProperty('padding-bottom', 'env(safe-area-inset-bottom)');
      div.style.setProperty('padding-left', 'env(safe-area-inset-left)');
      div.style.setProperty('padding-right', 'env(safe-area-inset-right)');
      div.style.setProperty('visibility', 'hidden');
      document.body.appendChild(div);

      const computed = window.getComputedStyle(div);
      
      setInsets({
        top: parseInt(computed.paddingTop) || 0,
        bottom: parseInt(computed.paddingBottom) || 0,
        left: parseInt(computed.paddingLeft) || 0,
        right: parseInt(computed.paddingRight) || 0,
      });

      document.body.removeChild(div);
    };

    updateInsets();
    window.addEventListener('resize', updateInsets);
    window.addEventListener('orientationchange', updateInsets);

    return () => {
      window.removeEventListener('resize', updateInsets);
      window.removeEventListener('orientationchange', updateInsets);
    };
  }, []);

  return insets;
}