import { cn } from '@/lib/utils';

export function Card({ children, variant = 'filled', className = '', ...props }) {
  const variantStyles = {
    filled: 'card',
    elevated: 'card-elevated',
    outlined: 'card-outlined',
  };

  return (
    <div className={cn(variantStyles[variant], className)} {...props}>
      {children}
    </div>
  );
}
