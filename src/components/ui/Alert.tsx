import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertProps {
  title?: string;
  message: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
  onClose?: () => void;
}

export function Alert({ 
  title, 
  message, 
  variant = 'default', 
  className,
  onClose 
}: AlertProps) {
  const baseClasses = "rounded-md p-4";
  
  const variantClasses = {
    default: "bg-blue-50 text-blue-700",
    success: "bg-green-50 text-green-700",
    warning: "bg-amber-50 text-amber-700",
    error: "bg-red-50 text-red-700",
  };
  
  const iconMap = {
    default: <Info className="h-5 w-5" />,
    success: <CheckCircle className="h-5 w-5" />,
    warning: <AlertCircle className="h-5 w-5" />,
    error: <XCircle className="h-5 w-5" />,
  };
  
  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      <div className="flex">
        <div className="flex-shrink-0">
          {iconMap[variant]}
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium">{title}</h3>
          )}
          <div className={title ? "mt-2 text-sm" : "text-sm"}>
            {message}
          </div>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              type="button"
              className="inline-flex rounded-md p-1.5 hover:bg-gray-100"
              onClick={onClose}
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 