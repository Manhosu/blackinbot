'use client';

import { FiBox } from 'react-icons/fi';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactElement;
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon
}: EmptyStateProps) {
  const IconComponent = icon || <FiBox />;
  
  return (
    <div className="p-8 rounded-xl border border-white/20 glass text-center w-full">
      <div className="flex flex-col items-center space-y-4">
        <div className="text-white/40 text-5xl">
          {IconComponent}
        </div>
        
        <h2 className="text-xl font-bold text-white">
          {title}
        </h2>
        
        <p className="text-white/60">
          {description}
        </p>
        
        {actionLabel && onAction && (
          <Button 
            variant="gradient" 
            onClick={onAction}
            className="mt-2"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
} 