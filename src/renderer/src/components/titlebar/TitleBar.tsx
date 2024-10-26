import React, { useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import './TitleBar.scss';
import TitleBarSection, { TitleBarSectionProps } from './TitleBarSection';
import TitleBarElement, { TitleBarElementProps } from './TitleBarElement';
import useTitleBarUtils from './useTitleBarUtils';
import useUtilStore from '@renderer/store/utilStore';

interface TitleBarProps {
  className?: string;
  disableResize?: boolean;
  children: ReactNode;
}

const TitleBar: React.FC<TitleBarProps> & {
  Section: React.FC<TitleBarSectionProps>;
  Element: React.FC<TitleBarElementProps>;
} = ({ className, disableResize = false, children }: TitleBarProps) => {
  const [focused, setFocused] = useState(true);
  const [os, isWindowFullscreen, isWindowMaximised] = useUtilStore((state) => [
    state.platform,
    state.isWindowFullscreen,
    state.isWindowMaximised
  ]);
  const [isWindows, isLinux, isMac] = [os === 'win32', os === 'linux', os === 'darwin'];

  const titleBarRef = useRef<HTMLDivElement>(null);
  const {
    sectionRefs,
    elementRefs,
    calculateAvailableSpace,
    calculateGap,
    getSectionRef,
    getElementRef
  } = useTitleBarUtils(children, titleBarRef);

  const handleResize = useCallback(() => {
    const sections = React.Children.toArray(children) as React.ReactElement[];
    const spacing = 16;

    sections.sort(
      (a, b) =>
        (b.props as TitleBarSectionProps).priority - (a.props as TitleBarSectionProps).priority
    );

    sections.forEach((section) => {
      const sectionName = (section.props as TitleBarSectionProps).name;
      const sectionElement = sectionRefs.current[sectionName];
      const elements = Object.values(elementRefs.current[sectionName]).filter(Boolean);

      if (elements.length === 1 && sections.length === 1) {
        return;
      }

      elements.sort((a, b) => {
        const aPriority = Number(a?.getAttribute('data-priority') ?? Infinity);
        const bPriority = Number(b?.getAttribute('data-priority') ?? Infinity);
        return bPriority - aPriority;
      });

      elements.forEach((element) => {
        if (!element) return;

        const gap = calculateGap(sectionName);
        const isEnoughGap = gap >= spacing;

        if (gap == -1) {
          return;
        }

        const isElementVisible = element.style.display !== 'none';
        if (isElementVisible && !isEnoughGap) {
          element.style.display = 'none';

          if (element.getAttribute('data-priority') === '1' && sectionElement) {
            sectionElement.visible = false;
          }
          return;
        }
      });
    });

    sections.reverse().forEach((section) => {
      const sectionName = (section.props as TitleBarSectionProps).name;
      const sectionElement = sectionRefs.current[sectionName];
      const elements = Object.values(elementRefs.current[sectionName]).filter(Boolean);

      if (elements.length === 1 && sections.length === 1) {
        return;
      }

      elements.reverse().forEach((element) => {
        if (!element) return;

        const isElementVisible = element.style.display !== 'none';
        const isTemporarilyHidden =
          element.style.visibility === 'hidden' && element.style.display === 'block';
        if (isElementVisible && !isTemporarilyHidden) {
          return;
        }

        let elementWidth = element.offsetWidth;
        const isEnoughSpace = calculateAvailableSpace() - elementWidth >= spacing;
        const gap = calculateGap(sectionName);

        if (gap == -1) {
          return;
        }
        let isEnoughGap = gap - elementWidth >= spacing;

        if (!isElementVisible && isEnoughSpace && isEnoughGap) {
          element.style.visibility = 'hidden';
          element.style.display = 'block';
          elementWidth = element.offsetWidth;
          isEnoughGap = calculateGap(sectionName) >= spacing;
        }

        if (isEnoughGap && isEnoughSpace) {
          if (sectionElement) {
            if (
              !sectionElement.visible &&
              element.getAttribute('data-priority') !== '1' &&
              (section.props as TitleBarSectionProps).priority !== 1
            ) {
              return;
            }
            sectionElement.visible = true;
          }

          element.style.visibility = 'visible';
        } else {
          element.style.display = 'none';
        }
      });
    });
  }, [children, calculateAvailableSpace, calculateGap, sectionRefs, elementRefs]);

  useEffect(() => {
    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('focus', () => {
      setFocused(true);
    });
    window.addEventListener('blur', () => {
      setFocused(false);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('focus', () => {
        setFocused(true);
      });
      window.removeEventListener('blur', () => {
        setFocused(false);
      });
    };
  }, [children, handleResize]);

  const isTitleBarElement = (
    element: React.ReactNode
  ): element is React.ReactElement<TitleBarElementProps> => {
    return (
      React.isValidElement(element) &&
      typeof (element.props as TitleBarElementProps).priority === 'number'
    );
  };

  const minimiseWindow = (): void => {
    window.api.window.minimise();
  };

  const maximiseWindow = (): void => {
    window.api.window.maximise();
  };

  const unmaximiseWindow = (): void => {
    window.api.window.unmaximise();
  };

  const closeWindow = (): void => {
    window.api.window.close();
  };

  return (
    <div
      className={`titlebar-container ${className ?? ''} ${focused ? 'focused' : 'unfocused'}`}
      ref={titleBarRef}
      style={{
        paddingLeft: isMac ? (isWindowFullscreen ? '15px' : '80px') : '16px',
        paddingRight: isMac ? '16px' : isWindows || isLinux ? '99px' : '0px'
      }}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const { name, priority } = child.props as TitleBarSectionProps;
          return (
            <div
              key={name}
              className={`titlebar-section ${name} h-100`}
              ref={getSectionRef(name)}
              data-priority={priority}
            >
              {React.Children.map((child.props as TitleBarSectionProps).children, (element) =>
                isTitleBarElement(element) ? (
                  <div
                    key={element.props.priority}
                    ref={getElementRef(name, element.props.priority)}
                    data-priority={element.props.priority}
                    className="h-100"
                  >
                    {element}
                  </div>
                ) : null
              )}
            </div>
          );
        }
        return null;
      })}

      {(isWindows || isLinux) && (
        <>
          <div className={`d-flex position-absolute translate-end-x end-0`}>
            <div
              className={`windows-caption-buttons d-flex ${focused ? 'focused' : 'unfocused'}`}
              id="windowsCaptionButtons"
            >
              <div
                className={`element caption-minimise ${disableResize ? 'disable-resize' : ''}`}
                onClick={() => {
                  if (!disableResize) minimiseWindow();
                }}
              >
                <svg>
                  <line x1="1" y1="5.5" x2="11" y2="5.5" />
                </svg>
              </div>
              {!isWindowMaximised && (
                <div
                  className={`element caption-maximize ${disableResize ? 'disable-resize' : ''}`}
                  onClick={() => {
                    if (!disableResize) maximiseWindow();
                  }}
                >
                  <svg>
                    <rect x="1.5" y="1.5" width="9" height="9" />
                  </svg>
                </div>
              )}
              {isWindowMaximised && (
                <div
                  className={`element caption-restore ${disableResize ? 'disable-resize' : ''}`}
                  onClick={() => {
                    if (!disableResize) unmaximiseWindow();
                  }}
                >
                  <svg>
                    <rect x="1.5" y="3.5" width="7" height="7" />
                    <polyline points="3.5,3.5 3.5,1.5 10.5,1.5 10.5,8.5 8.5,8.5" />
                  </svg>
                </div>
              )}
              <div
                className="element caption-close"
                style={{ paddingRight: '10px' }}
                onClick={() => {
                  closeWindow();
                }}
              >
                <svg>
                  <path d="M1,1 l 10,10 M1,11 l 10,-10" />
                </svg>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Add a display name for easier debugging

// Add PropTypes for additional runtime validation

TitleBar.Section = TitleBarSection;
TitleBar.Element = TitleBarElement;

export default TitleBar;
