import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ title, value, icon, className = '' }: StatCardProps) {
  return (
    <div className={`card-stat ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="card-stat-title">{title}</h3>
          <p className="card-stat-value">{value}</p>
        </div>
        {icon && (
          <div className="text-secondary-foreground">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
} 