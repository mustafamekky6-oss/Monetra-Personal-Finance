import type { LucideIcon } from 'lucide-react';
import {
  Briefcase,
  Car,
  CircleDollarSign,
  Clapperboard,
  Gift,
  HeartPulse,
  Home,
  Laptop,
  Plane,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  Briefcase,
  Car,
  CircleDollarSign,
  Clapperboard,
  Gift,
  HeartPulse,
  Home,
  Laptop,
  Plane,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  UtensilsCrossed,
  Zap,
};

export function CategoryIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = ICONS[name] ?? CircleDollarSign;
  return <Icon size={size} aria-hidden />;
}
