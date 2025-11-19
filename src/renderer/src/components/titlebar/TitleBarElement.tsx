import React, { useMemo } from 'react';

export interface TitleBarElementProps {
  children: React.ReactNode;
  priority: number;
}

const TitleBarElement = ({ children, priority }: TitleBarElementProps) => {
  const calculatedChildren = useMemo(() => {
    return (
      <div className="h-100" data-priority={priority}>
        {children}
      </div>
    );
  }, [children, priority]);

  return calculatedChildren;
};

// Add a display name for easier debugging
TitleBarElement.displayName = 'TitleBarElement';

export default TitleBarElement;
