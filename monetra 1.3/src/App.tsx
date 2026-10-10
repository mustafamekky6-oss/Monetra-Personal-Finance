import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/pages/DashboardPage';
import { useAppStore } from '@/store/AppStore';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const TransactionsPage = lazy(() => import('@/pages/TransactionsPage'));
const BudgetsPage = lazy(() => import('@/pages/BudgetsPage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
const RecurringPage = lazy(() => import('@/pages/RecurringPage'));
const GoalsPage = lazy(() => import('@/pages/GoalsPage'));
const InsightsPage = lazy(() => import('@/pages/InsightsPage'));
const SimulatorPage = lazy(() => import('@/pages/SimulatorPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function Loading() {
  return (
    <div className="flex h-64 items-center justify-center" role="status" aria-label="Loading page">
      <span className="h-1 w-10 animate-pulse rounded-full bg-iris-gleam" />
    </div>
  );
}

/** The app shell wraps every in-app route; the landing page stays outside it. */
function AppLayout() {
  return (
    <AppShell>
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}

export default function App() {
  const { data } = useAppStore();

  // Apply the persisted theme to the document root.
  useEffect(() => {
    document.documentElement.classList.toggle('light', data.preferences.theme === 'light');
  }, [data.preferences.theme]);

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<AppLayout />}>
          <Route path="/app" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/recurring" element={<RecurringPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/home" element={<Navigate to="/app" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
