import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { usePageMeta } from '@/components/layout/AppShell';

export default function NotFoundPage() {
  usePageMeta('Page not found');
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="label-mono text-muted">Error 404</p>
      <h1 className="mt-3 font-display text-[56px] leading-[0.9] text-heading sm:text-[80px]">Off the map</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-body">
        This route does not exist in Monetra. The ledger, budgets and everything else are one click away.
      </p>
      <Link to="/app" className="mt-8">
        <Button withArrow>
          <Compass size={15} aria-hidden /> Back to overview
        </Button>
      </Link>
    </div>
  );
}
