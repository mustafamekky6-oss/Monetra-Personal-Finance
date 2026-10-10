import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  CircleDollarSign,
  FlaskConical,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Moon,
  Repeat,
  Scale,
  Search,
  Settings,
  Sun,
  Target,
  Wallet,
  X,
} from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { formatMoney } from '@/lib/format';
import { financialMonthRange, relativeDateLabel, todayISO } from '@/lib/date';
import { netCashflow, transactionsInRange } from '@/utils/finance';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: Wallet },
  { to: '/budgets', label: 'Budgets', icon: Scale },
  { to: '/analytics', label: 'Analytics', icon: CircleDollarSign },
  { to: '/recurring', label: 'Recurring', icon: Repeat },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/insights', label: 'Insights', icon: Lightbulb },
  { to: '/simulator', label: 'Simulator', icon: FlaskConical },
] as const;

const PAGE_TITLES: Record<string, string> = {
  '/': 'Overview',
  '/transactions': 'Transactions',
  '/budgets': 'Budgets',
  '/analytics': 'Analytics',
  '/recurring': 'Recurring Expenses',
  '/goals': 'Financial Goals',
  '/insights': 'Insights',
  '/simulator': 'What-If Simulator',
  '/settings': 'Settings',
};

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/logo.svg" alt="" width={30} height={30} className="shrink-0" />
      <span className="font-display text-[21px] leading-none text-heading">Monetra</span>
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1440px]">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main id="main" className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pb-12">
            {children ?? <Outlet />}
          </main>
          <FooterNote />
        </div>
      </div>
      <MobileNav />
    </div>
  );
}

function Sidebar() {
  const { data } = useAppStore();
  const monthNet = useMemo(() => {
    // Uses the user's financial month, consistent with budgets and the dashboard.
    const today = todayISO();
    const { start, end } = financialMonthRange(today, data.preferences.monthStartDay);
    return netCashflow(transactionsInRange(data.transactions, { start, end, label: 'month' }));
  }, [data.transactions, data.preferences.monthStartDay]);

  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-lift/8 bg-inset/70 px-4 py-6 lg:flex">
      <div className="px-3 pb-8 pt-1">
        <Logo />
      </div>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, ...rest }) => (
          <NavLink
            key={to}
            to={to}
            end={'end' in rest ? rest.end : false}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-(--radius-input) px-3 py-2.5 text-[15px] transition-colors duration-200 ${
                isActive ? 'bg-lift/10 text-heading' : 'text-body hover:bg-lift/5 hover:text-heading'
              }`
            }
          >
            <Icon size={17} aria-hidden />
            {label}
          </NavLink>
        ))}
        <div className="my-4 border-t border-lift/8" />
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-(--radius-input) px-3 py-2.5 text-[15px] transition-colors duration-200 ${
              isActive ? 'bg-lift/10 text-heading' : 'text-body hover:bg-lift/5 hover:text-heading'
            }`
          }
        >
          <Settings size={17} aria-hidden />
          Settings
        </NavLink>
      </nav>
      <div className="rounded-(--radius-card) bg-card p-4">
        <p className="label-mono text-muted">This month&apos;s net</p>
        <p
          className={`mt-1.5 font-mono text-lg tabular-nums ${monthNet >= 0 ? 'text-income' : 'text-expense'}`}
        >
          {formatMoney(monthNet, data.preferences.currency, { signed: true })}
        </p>
        <p className="mt-1 text-xs text-muted">Financial month to date</p>
      </div>
    </aside>
  );
}

function Topbar() {
  const location = useLocation();
  const { data, actions } = useAppStore();
  const [query, setQuery] = useState('');
  const title = PAGE_TITLES[location.pathname] ?? 'Monetra';

  const navigate = useNavigate();

  // Search navigates to the transactions page with the query pre-filled.
  const onSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    navigate(query ? `/transactions?q=${encodeURIComponent(query)}` : '/transactions');
    setQuery('');
  };

  const today = relativeDateLabel(new Date().toISOString().slice(0, 10));
  const isLight = data.preferences.theme === 'light';

  return (
    <header className="sticky top-0 z-40 border-b border-lift/8 bg-canvas/70 px-4 py-3.5 backdrop-blur-[24px] sm:px-6 lg:px-10">
      <div className="flex items-center gap-3">
        <span className="lg:hidden">
          <Logo />
        </span>
        <p className="label-mono hidden text-body lg:block">
          {today} — {data.isDemoData ? 'Demo data' : 'Your records'}
        </p>
        <form onSubmit={onSearchSubmit} className="ml-auto hidden max-w-xs flex-1 sm:block">
          <label htmlFor="global-search" className="sr-only">
            Search transactions
          </label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input
              id="global-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search transactions…"
              className="w-full rounded-(--radius-input) border border-lift/12 bg-lift/5 py-2 pl-9 pr-3 text-sm text-heading placeholder:text-muted transition-colors duration-200 focus:border-cyan-signal/60 focus:outline-none"
            />
          </div>
        </form>
        <button
          type="button"
          onClick={() => actions.setPreferences({ theme: isLight ? 'dark' : 'light' })}
          aria-label={`Switch to ${isLight ? 'dark' : 'light'} mode`}
          aria-pressed={isLight}
          className="relative ml-auto rounded-(--radius-input) p-2 text-body transition-colors duration-200 hover:bg-lift/10 hover:text-heading sm:ml-0"
        >
          {isLight ? <Moon size={17} aria-hidden /> : <Sun size={17} aria-hidden />}
        </button>
        <button
          type="button"
          className="relative rounded-(--radius-input) p-2 text-body transition-colors duration-200 hover:bg-lift/10 hover:text-heading"
          aria-label={`Notifications — ${data.isDemoData ? 'demo data active' : 'no alerts'}`}
          title="Demo mode indicator — see Insights page for data-driven alerts"
        >
          <Bell size={17} aria-hidden />
          {data.isDemoData && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-iris-gleam" aria-hidden />
          )}
        </button>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full border border-lift/15 bg-lift/10 font-mono text-xs text-heading"
          title="Demo profile — no account system in this local app"
        >
          JD
        </div>
      </div>
      <p className="label-mono mt-2 text-muted lg:hidden">{title}</p>
    </header>
  );
}

function MobileNav() {
  const { data, actions } = useAppStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const close = () => setMoreOpen(false);
  const isLight = data.preferences.theme === 'light';

  const primary = NAV_ITEMS.filter((item) => item.to !== '/insights' && item.to !== '/simulator');
  const more = [
    ...NAV_ITEMS.filter((item) => item.to === '/insights' || item.to === '/simulator'),
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
          <div className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={close} aria-hidden />
          <div className="absolute inset-x-0 bottom-0 rounded-t-(--radius-card) border-t border-lift/10 bg-inset px-4 pb-6 pt-4 backdrop-blur-[24px]">
            <div className="mb-3 flex items-center justify-between">
              <p className="label-mono text-muted">More</p>
              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="rounded p-1.5 text-muted transition-colors duration-200 hover:bg-lift/10 hover:text-heading"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            <ul className="grid grid-cols-3 gap-2">
              {more.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={close}
                    className="flex flex-col items-center gap-1.5 rounded-(--radius-card) bg-card px-3 py-4 text-[10px] font-mono uppercase tracking-wider text-body transition-colors duration-200 hover:text-heading"
                  >
                    <Icon size={19} aria-hidden />
                    {label}
                  </NavLink>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => actions.setPreferences({ theme: isLight ? 'dark' : 'light' })}
                  className="flex w-full flex-col items-center gap-1.5 rounded-(--radius-card) bg-card px-3 py-4 text-[10px] font-mono uppercase tracking-wider text-body transition-colors duration-200 hover:text-heading"
                >
                  {isLight ? <Moon size={19} aria-hidden /> : <Sun size={19} aria-hidden />}
                  {isLight ? 'Dark' : 'Light'}
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}
      <nav
        aria-label="Mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-lift/10 bg-inset/85 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-[24px] lg:hidden"
      >
        <ul className="flex items-center justify-between">
          {primary.slice(0, 5).map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 rounded-(--radius-input) px-1 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors duration-200 ${
                    isActive ? 'bg-lift/10 text-heading' : 'text-body'
                  }`
                }
              >
                <Icon size={19} aria-hidden />
                <span className="max-w-full truncate">{label.split(' ')[0]}</span>
              </NavLink>
            </li>
          ))}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="Open more navigation"
              aria-expanded={moreOpen}
              className="flex w-full flex-col items-center gap-1 rounded-(--radius-input) px-1 py-1.5 text-[10px] font-mono uppercase tracking-wider text-body transition-colors duration-200 hover:text-heading"
            >
              <Menu size={19} aria-hidden />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

function FooterNote() {
  return (
    <footer className="border-t border-lift/8 px-6 py-4 pb-20 lg:pb-4">
      <p className="text-xs leading-relaxed text-muted">
        Monetra is a local-first personal finance demo. All data shown is stored only in your browser; figures and
        projections are estimates, not financial advice.
      </p>
    </footer>
  );
}

/** Route-level title sync + scroll restoration. */
export function usePageMeta(title: string) {
  const location = useLocation();
  useEffect(() => {
    document.title = `${title} — Monetra`;
    window.scrollTo(0, 0);
  }, [title, location.pathname]);
}
