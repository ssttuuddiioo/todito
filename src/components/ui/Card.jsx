import { cn } from '@/lib/utils';

export function Card({ children, className = '', ...props }) {
  return (
    <div className={cn('card', className)} {...props}>
      {children}
    </div>
  );
}



