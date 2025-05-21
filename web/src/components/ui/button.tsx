import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-accent hover:bg-accent-hover text-white shadow-sm hover:shadow-accent/20 active:scale-95",
        destructive: "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm hover:shadow-destructive/20 active:scale-95",
        outline: "border border-border/50 hover:border-accent/30 bg-transparent hover:bg-white/5 text-foreground shadow-sm hover:shadow-md active:scale-95",
        secondary: "bg-secondary border border-border/50 hover:border-border text-secondary-foreground hover:bg-secondary-hover shadow-sm hover:shadow-md active:scale-95",
        ghost: "hover:bg-white/5 text-foreground hover:text-accent",
        link: "text-accent underline-offset-4 hover:underline",
        glass: "glass text-white hover:bg-white/10 shadow-sm hover:shadow-md active:scale-95",
        gradient: "bg-gradient-primary text-white shadow-sm hover:shadow-accent/20 active:scale-95",
      },
      size: {
        default: "h-11 px-6 py-2.5 rounded-full text-sm",
        sm: "h-9 px-3 py-2 rounded-full text-xs",
        lg: "h-12 px-8 py-3 rounded-full text-base",
        icon: "h-10 w-10 rounded-full",
      },
      rounded: {
        default: "rounded-full",
        md: "rounded-xl",
        sm: "rounded-lg",
        none: "rounded-none",
      },
      animation: {
        none: "",
        pulse: "animate-pulse-slow",
        float: "animate-float",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      rounded: "default",
      animation: "none",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, rounded, animation, isLoading, children, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, rounded, animation, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : leftIcon ? (
          <span className="mr-2 flex items-center">{leftIcon}</span>
        ) : null}
        
        {children}
        
        {rightIcon && !isLoading ? (
          <span className="ml-2 flex items-center">{rightIcon}</span>
        ) : null}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants }; 