import { useState, useEffect, useCallback, useMemo } from 'react';

interface VirtualScrollingOptions {
  itemHeight: number;
  containerHeight: number;
  items: any[];
  overscan?: number;
}

interface VirtualScrollingResult {
  virtualItems: Array<{
    index: number;
    start: number;
    end: number;
    item: any;
  }>;
  totalHeight: number;
  scrollToIndex: (index: number) => void;
  containerProps: {
    style: React.CSSProperties;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  };
  scrollElementProps: {
    style: React.CSSProperties;
  };
}

export function useVirtualScrolling({
  itemHeight,
  containerHeight,
  items,
  overscan = 5
}: VirtualScrollingOptions): VirtualScrollingResult {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  const totalHeight = items.length * itemHeight;

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const virtualItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    const virtualItems = [];
    
    for (let i = startIndex; i <= endIndex; i++) {
      virtualItems.push({
        index: i,
        start: i * itemHeight,
        end: (i + 1) * itemHeight,
        item: items[i]
      });
    }
    
    return virtualItems;
  }, [visibleRange, itemHeight, items]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    setScrollTop(element.scrollTop);
    
    if (!isScrolling) {
      setIsScrolling(true);
    }
  }, [isScrolling]);

  const scrollToIndex = useCallback((index: number) => {
    const element = document.querySelector('[data-virtual-scroll-container]') as HTMLElement;
    if (element) {
      element.scrollTop = index * itemHeight;
    }
  }, [itemHeight]);

  // Debounce scroll end detection
  useEffect(() => {
    if (isScrolling) {
      const timer = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [scrollTop, isScrolling]);

  const containerProps = useMemo(() => ({
    style: {
      height: containerHeight,
      overflow: 'auto' as const,
    },
    onScroll: handleScroll,
    'data-virtual-scroll-container': true,
  }), [containerHeight, handleScroll]);

  const scrollElementProps = useMemo(() => ({
    style: {
      height: totalHeight,
      position: 'relative' as const,
    }
  }), [totalHeight]);

  return {
    virtualItems,
    totalHeight,
    scrollToIndex,
    containerProps,
    scrollElementProps,
  };
}