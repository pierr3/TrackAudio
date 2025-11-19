/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import React, { useRef, useCallback } from 'react';
import { TitleBarSectionProps } from './TitleBarSection';

interface SectionRef {
  element: HTMLDivElement | null;
  visible: boolean;
}

const useTitleBarUtils = (
  children: React.ReactNode,
  titleBarRef: React.RefObject<HTMLDivElement | null> | null
): {
  sectionRefs: React.RefObject<Record<string, SectionRef | null>>;
  elementRefs: React.RefObject<Record<string, Record<number, HTMLDivElement | null>>>;
  calculateAvailableSpace: () => number;
  calculateGap: (sectionName: string) => number;
  getSectionRef: (name: string) => (ref: HTMLDivElement | null) => void;
  getElementRef: (sectionName: string, priority: number) => (ref: HTMLDivElement | null) => void;
} => {
  const sectionRefs = useRef<Record<string, SectionRef | null>>({});
  const elementRefs = useRef<Record<string, Record<number, HTMLDivElement | null>>>({});

  const calculateAvailableSpace = useCallback((): number => {
    const titleBarWidth = titleBarRef?.current?.offsetWidth ?? 0;
    const sections = React.Children.toArray(children) as React.ReactElement[];
    const spacing = 15;

    return sections.reduce((sum, section) => {
      const sectionName = (section.props as TitleBarSectionProps).name;
      const elements = Object.values(elementRefs.current[sectionName]).filter(Boolean);

      const visibleElements = elements.filter(
        (element) => element && element.style.display !== 'none'
      );
      const sectionWidth =
        visibleElements.reduce((sum, element) => sum + (element ? element.offsetWidth : 0), 0) +
        spacing * (visibleElements.length - 1);

      return sum - sectionWidth;
    }, titleBarWidth);
  }, [children, titleBarRef]);

  const calculateGap = useCallback((sectionName: string): number => {
    const sections = ['left', 'center', 'right'];
    const currentIndex = sections.indexOf(sectionName);

    if (currentIndex === -1) {
      return 0;
    }

    const currentSectionElement = sectionRefs.current[sectionName]?.element;

    if (!currentSectionElement) {
      return 0;
    }

    const currentSectionRect = currentSectionElement.getBoundingClientRect();

    let minGap = Infinity;
    let neighborFound = false;

    if (currentIndex > 0) {
      const leftNeighborSection = sections[currentIndex - 1];
      const leftNeighborElement = sectionRefs.current[leftNeighborSection]?.element;

      if (leftNeighborElement) {
        neighborFound = true;
        const leftNeighborRect = leftNeighborElement.getBoundingClientRect();
        const gap = currentSectionRect.left - leftNeighborRect.right;
        if (gap < 0) return 0;
        minGap = Math.min(minGap, gap);
      }
    }

    if (currentIndex < sections.length - 1) {
      const rightNeighborSection = sections[currentIndex + 1];
      const rightNeighborElement = sectionRefs.current[rightNeighborSection]?.element;

      if (rightNeighborElement) {
        neighborFound = true;
        const rightNeighborRect = rightNeighborElement.getBoundingClientRect();
        const gap = rightNeighborRect.left - currentSectionRect.right;
        if (gap < 0) return 0;
        minGap = Math.min(minGap, gap);
      }
    }

    if (!neighborFound) {
      return -1;
    }

    return minGap !== Infinity ? minGap : 0;
  }, []);

  const getSectionRef = useCallback(
    (name: string) => (ref: HTMLDivElement | null) => {
      sectionRefs.current[name] = { element: ref, visible: true };
      if (!elementRefs.current[name]) {
        elementRefs.current[name] = {};
      }
    },
    []
  );

  const getElementRef = useCallback(
    (sectionName: string, priority: number) => (ref: HTMLDivElement | null) => {
      if (!elementRefs.current[sectionName]) {
        elementRefs.current[sectionName] = {};
      }
      elementRefs.current[sectionName][priority] = ref;
    },
    []
  );

  return {
    sectionRefs,
    elementRefs,
    calculateAvailableSpace,
    calculateGap,
    getSectionRef,
    getElementRef
  };
};

export default useTitleBarUtils;
