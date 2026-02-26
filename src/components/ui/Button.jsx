import { cn } from '@/lib/utils';

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}) {
  const baseStyles = 'btn';
  const variantStyles = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outlined: 'btn-outlined',
    text: 'btn-text',
  };

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}
