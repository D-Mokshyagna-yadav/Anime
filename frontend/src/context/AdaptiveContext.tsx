import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'tv';
export type InputType = 'touch' | 'mouse' | 'keyboard' | 'remote';

interface AdaptiveState {
  deviceType: DeviceType;
  inputType: InputType;
  pixelDensity: number;
  viewportWidth: number;
  viewportHeight: number;
  gridColumns: number;
  isTouch: boolean;
  isRemoteLike: boolean;
}

const AdaptiveContext = createContext<AdaptiveState | null>(null);

const getDeviceType = (width: number): DeviceType => {
  if (width <= 768) return 'mobile';
  if (width <= 1024) return 'tablet';
  if (width <= 1920) return 'desktop';
  return 'tv';
};

const getGridColumns = (width: number, deviceType: DeviceType) => {
  if (deviceType === 'mobile') return 1;
  if (deviceType === 'tablet') return 2;
  if (deviceType === 'desktop') return Math.max(4, Math.min(6, Math.floor(width / 300)));
  return Math.max(6, Math.min(10, Math.floor(width / 280)));
};

const getInputType = (deviceType: DeviceType): InputType => {
  if (typeof window === 'undefined') return 'mouse';

  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const hover = window.matchMedia('(hover: hover)').matches;

  if (deviceType === 'tv') return 'remote';
  if (coarse && !hover) return 'touch';
  return 'mouse';
};

const findFocusableElements = () => {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.offsetParent !== null;
  });
};

export function AdaptiveProvider({ children }: { children: React.ReactNode }) {
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);
  const [deviceType, setDeviceType] = useState<DeviceType>(() => getDeviceType(window.innerWidth));
  const [inputType, setInputType] = useState<InputType>(() => getInputType(getDeviceType(window.innerWidth)));
  const [pixelDensity, setPixelDensity] = useState(() => window.devicePixelRatio || 1);

  useEffect(() => {
    const update = () => {
      const nextWidth = window.innerWidth;
      const nextHeight = window.innerHeight;
      const nextDevice = getDeviceType(nextWidth);

      setViewportWidth(nextWidth);
      setViewportHeight(nextHeight);
      setDeviceType(nextDevice);
      setPixelDensity(window.devicePixelRatio || 1);
      setInputType((prev) => {
        if (prev === 'keyboard' || prev === 'remote') {
          return nextDevice === 'tv' ? 'remote' : prev;
        }
        return getInputType(nextDevice);
      });
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        setInputType('touch');
      } else {
        setInputType(deviceType === 'tv' ? 'remote' : 'mouse');
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const directional = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key);

      if (deviceType === 'tv' || directional) {
        setInputType('remote');
      } else {
        setInputType('keyboard');
      }

      if (!directional) return;

      const focusable = findFocusableElements();
      if (focusable.length === 0) return;

      const active = document.activeElement as HTMLElement | null;
      const currentIndex = active ? focusable.indexOf(active) : -1;
      const delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      const nextIndex = currentIndex < 0 ? 0 : (currentIndex + delta + focusable.length) % focusable.length;
      const next = focusable[nextIndex];

      if (next) {
        event.preventDefault();
        next.focus();
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [deviceType]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const columns = getGridColumns(viewportWidth, deviceType);

    root.setAttribute('data-device', deviceType);
    root.setAttribute('data-input', inputType);

    root.style.setProperty('--adaptive-grid-columns', String(columns));
    root.style.setProperty('--adaptive-ui-scale', deviceType === 'tv' ? '1.18' : deviceType === 'mobile' ? '0.96' : '1');

    ['mobile', 'tablet', 'desktop', 'tv'].forEach((value) => body.classList.remove(`device-${value}`));
    ['touch', 'mouse', 'keyboard', 'remote'].forEach((value) => body.classList.remove(`input-${value}`));

    body.classList.add(`device-${deviceType}`);
    body.classList.add(`input-${inputType}`);
  }, [deviceType, inputType, viewportWidth]);

  const value = useMemo<AdaptiveState>(() => {
    const columns = getGridColumns(viewportWidth, deviceType);
    return {
      deviceType,
      inputType,
      pixelDensity,
      viewportWidth,
      viewportHeight,
      gridColumns: columns,
      isTouch: inputType === 'touch',
      isRemoteLike: inputType === 'remote' || deviceType === 'tv',
    };
  }, [deviceType, inputType, pixelDensity, viewportWidth, viewportHeight]);

  return <AdaptiveContext.Provider value={value}>{children}</AdaptiveContext.Provider>;
}

export function useAdaptive() {
  const context = useContext(AdaptiveContext);
  if (!context) {
    throw new Error('useAdaptive must be used within AdaptiveProvider');
  }
  return context;
}
