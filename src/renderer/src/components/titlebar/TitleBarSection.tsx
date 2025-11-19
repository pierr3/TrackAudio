import React, { useMemo } from 'react';
import TitleBarElement from './TitleBarElement';

export interface TitleBarSectionProps {
  children: React.ReactNode;
  priority: number;
  name: string;
}

const TitleBarSection = ({ children }: TitleBarSectionProps) => {
  const childrenWithPriorities = useMemo(() => {
    return React.Children.map(children, (child) => {
      if (React.isValidElement(child) && child.type === TitleBarElement) {
        return child;
      }
      return <TitleBarElement priority={Infinity}>{child}</TitleBarElement>;
    });
  }, [children]);

  return <>{childrenWithPriorities}</>;
};

export default TitleBarSection;
