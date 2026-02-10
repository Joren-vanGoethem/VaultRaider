import type React from "react";

interface PageHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function PageHeader({ children, className = "" }: PageHeaderProps) {
  return (
    <h1 className={`text-5xl font-bold pb-6 gradient-text text-center ${className}`}>{children}</h1>
  );
}
