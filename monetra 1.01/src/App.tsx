import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/pages/DashboardPage';

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

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/recurring" element={<RecurringPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
