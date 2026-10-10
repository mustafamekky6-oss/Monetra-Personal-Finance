import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Clapperboard,
  FlaskConical,
  Lightbulb,
  Lock,
  MonitorSmartphone,
  Repeat,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import { usePageMeta } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';

/**
 * Landing page — the marketing face of Monetra, following the design system's
 * gallery language: dark canvas (theme-aware), whisper-weight serif display,
 * chromatic feature tiles, one inverted stat band, glass nav.
 */
export default function LandingPage() {
  usePageMeta('Welcome');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  // The hero prompt doubles as a real ledger search — it opens the app filtered.
  const onSearch = (event: React.FormEvent) => {
    event.preventDefault();
    navigate(query ? `/transactions?q=${encodeURIComponent(query)}` : '/transactions');
  };

  return (
    <div className="min-h-dvh bg-canvas text-body">
      {/* Glass nav */}
      <header className="sticky top-0 z-40 border-b border-lift/8 bg-canvas/70 backdrop-blur-[24px]">
        <nav aria-label="Landing" className="mx-auto flex w-full max-w-[1200px] items-center gap-4 px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Monetra home">
            <img src="/logo.svg" alt="" width={28} height={28} />
            <span className="font-display text-[20px] leading-none text-heading">Monetra</span>
          </Link>
          <div className="ml-6 hidden gap-2 md:flex">
            <a href="#features" className="rounded-(--radius-button) border border-lift/40 px-4 py-2 text-[15px] text-heading transition-colors duration-200 hover:bg-lift/10">
              Features
            </a>
            <a href="#how" className="rounded-(--radius-button) border border-lift/40 px-4 py-2 text-[15px] text-heading transition-colors duration-200 hover:bg-lift/10">
              How it works
            </a>
            <a href="#privacy" className="rounded-(--radius-button) border border-lift/40 px-4 py-2 text-[15px] text-heading transition-colors duration-200 hover:bg-lift/10">
              Privacy
            </a>
          </div>
          <Link to="/app" className="ml-auto">
            <Button withArrow>Open the app</Button>
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        {/* Hero */}
        <section className="animate-rise flex flex-col items-center pb-20 pt-16 text-center sm:pt-24">
          <p className="rounded-full border border-lift/15 bg-lift/10 px-8 py-2.5 font-mono text-[10px] uppercase tracking-[0.182em] text-heading">
            Personal finance intelligence
          </p>
          <h1 className="mt-8 max-w-[14ch] font-display text-[42px] leading-[0.95] text-heading sm:text-[64px] lg:text-[80px] lg:leading-[0.9]">
            <em>Own</em> the quiet side of your money
          </h1>
          <p className="mt-6 max-w-[560px] text-[18px] font-light leading-[1.5] text-body">
            Monetra turns a simple ledger into clarity — spending, budgets, recurring bills,
            goals and what-if scenarios, computed entirely on your device.
          </p>

          {/* Functional ledger search */}
          <form onSubmit={onSearch} className="mt-10 w-full max-w-xl">
            <label htmlFor="landing-search" className="sr-only">
              Search your ledger
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-[22px] top-1/2 -translate-y-1/2 text-muted" aria-hidden />
              <input
                id="landing-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Where did my money go last month?"
                className="w-full rounded-(--radius-input) border border-lift/10 bg-field py-3 pl-[58px] pr-14 text-base text-heading placeholder:text-muted focus:border-cyan-signal/60 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Search your ledger"
                className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-lift/20 text-heading transition-colors duration-200 hover:bg-lift/30"
              >
                <ArrowRight size={16} aria-hidden />
              </button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/app">
              <Button withArrow>Open the app</Button>
            </Link>
            <a href="#features">
              <Button variant="ghost">Explore features</Button>
            </a>
          </div>
        </section>

        {/* Feature tiles — color is the only differentiator */}
        <section id="features" aria-label="Features" className="scroll-mt-24 pb-20">
          <div className="mb-10 text-center">
            <p className="label-mono text-muted">Six modules, one ledger</p>
            <h2 className="mt-3 font-display text-[30px] leading-[0.95] text-heading sm:text-[38px] sm:leading-[0.9]">
              A quiet system for loud finances
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureTile
              to="/app"
              color="#847dff"
              icon={<Sparkles size={22} aria-hidden />}
              title="Overview"
              description="Balance, cash flow, savings rate and month-over-month signals on one calm surface."
            />
            <FeatureTile
              to="/budgets"
              color="#00b3dd"
              icon={<Scale size={22} aria-hidden />}
              title="Budgets"
              description="Monthly limits per category with live utilization and warnings before you overspend."
            />
            <FeatureTile
              to="/recurring"
              color="#4b49aa"
              icon={<Repeat size={22} aria-hidden />}
              title="Recurring"
              description="Rent, subscriptions, salary — projected forward so nothing surprises you."
            />
            <FeatureTile
              to="/goals"
              color="#dd90d8"
              icon={<Target size={22} aria-hidden />}
              title="Goals"
              description="Transparent pace math tells you whether each goal is realistic — and why."
            />
            <FeatureTile
              to="/insights"
              color="#90b8f0"
              icon={<Lightbulb size={22} aria-hidden />}
              title="Insights"
              description="Rule-based observations derived from your records. No AI theater, no invented numbers."
            />
            <FeatureTile
              to="/simulator"
              color="#d1c9ff"
              icon={<FlaskConical size={22} aria-hidden />}
              title="What-if"
              description="Drag a slider, watch ten years of projections respond — without touching real data."
            />
          </div>
        </section>

        {/* Inverted stat band — the one light break in the dark rhythm */}
        <section aria-label="Why Monetra" className="pb-20">
          <div className="grid gap-3 rounded-(--radius-tile) bg-inverted p-8 text-on-inverted sm:grid-cols-3 sm:p-10">
            <Stat value="100%" label="Local-first" note="Data lives in your browser. No accounts, no cloud." />
            <Stat value="0" label="Bank connections" note="No credentials, no feeds — you stay in control." />
            <Stat value="9" label="Modules" note="Ledger to simulator, one coherent data model." />
          </div>
        </section>

        {/* How it works */}
        <section id="how" aria-label="How it works" className="scroll-mt-24 pb-20">
          <div className="mb-10 text-center">
            <p className="label-mono text-muted">How it works</p>
            <h2 className="mt-3 font-display text-[30px] leading-[0.95] text-heading sm:text-[38px] sm:leading-[0.9]">
              Three steps to clarity
            </h2>
          </div>
          <ol className="grid gap-3 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Record',
                text: 'Log income and expenses in seconds — or start from the realistic demo ledger and make it yours.',
              },
              {
                step: '02',
                title: 'Understand',
                text: 'Every chart, budget and insight derives from the same records. No hardcoded totals, ever.',
              },
              {
                step: '03',
                title: 'Project',
                text: 'Simulate income and spending changes, then watch the long-run consequences unfold instantly.',
              },
            ].map(({ step, title, text }) => (
              <li key={step} className="rounded-(--radius-card) bg-card p-6 sm:p-8">
                <p className="font-mono text-[12px] tracking-[0.16em] text-income">{step}</p>
                <h3 className="mt-3 font-display text-[24px] leading-tight text-heading">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-body">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Privacy band */}
        <section id="privacy" aria-label="Privacy" className="scroll-mt-24 pb-20">
          <div className="flex flex-col gap-8 rounded-(--radius-card) bg-inset p-8 sm:flex-row sm:items-center sm:p-10">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-lift/8 text-income">
              <ShieldCheck size={26} aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-[26px] leading-tight text-heading sm:text-[30px]">
                Privacy is the architecture, not a promise
              </h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-body">
                Monetra never asks for bank credentials, never uploads a record, and never
                executes a payment. Everything — transactions, budgets, goals, preferences —
                is stored in your browser&apos;s local storage and exportable as CSV or JSON
                whenever you want to leave. It is a personal finance management demo, and its
                projections are estimates, not financial advice.
              </p>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                {[
                  { icon: <Lock size={13} aria-hidden />, text: 'No account required' },
                  { icon: <MonitorSmartphone size={13} aria-hidden />, text: 'Works offline once loaded' },
                  { icon: <Clapperboard size={13} aria-hidden />, text: 'Dark & light gallery themes' },
                ].map(({ icon, text }) => (
                  <li key={text} className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                    <span className="text-income">{icon}</span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="pb-24 text-center">
          <h2 className="mx-auto max-w-[16ch] font-display text-[34px] leading-[0.95] text-heading sm:text-[48px] sm:leading-[0.9]">
            <em>Begin</em> with a single record
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-body">
            Open the app and the demo ledger is already alive — six months of realistic history,
            ready to explore or replace.
          </p>
          <Link to="/app" className="mt-8 inline-block">
            <Button withArrow>Open Monetra</Button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-lift/8">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start justify-between gap-4 px-5 py-8 sm:flex-row sm:items-center sm:px-8">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="" width={22} height={22} />
            <span className="font-display text-[17px] leading-none text-heading">Monetra</span>
          </div>
          <p className="max-w-xl text-xs leading-relaxed text-muted">
            A local-first personal finance demo. All data is stored only in your browser;
            figures and projections are estimates, not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureTile({
  to,
  color,
  icon,
  title,
  description,
}: {
  to: string;
  color: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col gap-8 rounded-(--radius-tile) p-6 transition-transform duration-200 ease-out hover:-translate-y-1 sm:p-8"
      style={{ backgroundColor: color }}
    >
      <span className="text-white/85">{icon}</span>
      <span>
        <span className="block font-display text-[24px] leading-tight text-white sm:text-[30px]">{title}</span>
        <span className="mt-2 block text-[14px] leading-[1.5] text-white/80 sm:text-[15px]">{description}</span>
      </span>
    </Link>
  );
}

function Stat({ value, label, note }: { value: string; label: string; note: string }) {
  return (
    <div>
      <p className="font-mono text-[34px] tabular-nums sm:text-[38px]">{value}</p>
      <p className="label-mono mt-1 text-on-inverted/70">{label}</p>
      <p className="mt-2 text-[14px] leading-relaxed text-on-inverted/80">{note}</p>
    </div>
  );
}
