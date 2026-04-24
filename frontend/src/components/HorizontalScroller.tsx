import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalScrollerProps {
  children: React.ReactNode;
  className?: string;
  ariaLabel: string;
}

const getCardWidth = () => {
  if (typeof window === 'undefined') return 240;
  const width = window.innerWidth;
  if (width <= 768) return 150;
  if (width <= 1024) return 200;
  return 240;
};

const getAlignedScrollLeft = (nextLeft: number, step: number) => {
  const normalized = Math.max(0, nextLeft);
  const index = Math.round(normalized / step);
  return index * step;
};

export default function HorizontalScroller({ children, className = '', ariaLabel }: HorizontalScrollerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const step = useMemo(() => {
    const cardWidth = getCardWidth();
    return cardWidth * 2;
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const syncButtons = () => {
    const node = containerRef.current;
    if (!node) return;

    const maxScroll = node.scrollWidth - node.clientWidth;
    setAtStart(node.scrollLeft <= 4);
    setAtEnd(node.scrollLeft >= maxScroll - 4);
  };

  const onScroll = () => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(syncButtons, 50);
  };

  const scrollByDirection = (direction: 'left' | 'right') => {
    const node = containerRef.current;
    if (!node) return;

    const rawLeft = direction === 'left' ? node.scrollLeft - step : node.scrollLeft + step;
    const left = getAlignedScrollLeft(rawLeft, step);

    node.scrollTo({ left, behavior: 'smooth' });
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollByDirection('left');
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollByDirection('right');
    }
  };

  return (
    <div className="h-scroll-wrap">
      <button
        type="button"
        className="h-scroll-btn left"
        aria-label={`Scroll ${ariaLabel} left`}
        onClick={() => scrollByDirection('left')}
        disabled={atStart}
      >
        <ChevronLeft size={20} />
      </button>

      <div
        ref={containerRef}
        className={`h-scroll ${className}`.trim()}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>

      <button
        type="button"
        className="h-scroll-btn right"
        aria-label={`Scroll ${ariaLabel} right`}
        onClick={() => scrollByDirection('right')}
        disabled={atEnd}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
