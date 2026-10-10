import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';
import { AppStoreProvider } from '@/store/AppStore';
import { ToastProvider } from '@/store/ToastContext';

const ROUTES = [
  ['/', 'Your financial picture'],
  ['/transactions', 'Transactions'],
  ['/budgets', 'Budgets'],
  ['/analytics', 'Financial analytics'],
  ['/recurring', 'Recurring transactions'],
  ['/goals', 'Financial goals'],
  ['/insights', 'Financial insights'],
  ['/simulator', 'What-if simulator'],
  ['/settings', 'Settings'],
  ['/no-such-route', 'Off the map'],
] as const;

/**
 * Smoke test: with the demo dataset seeded, every route mounts and renders its
 * headline without crashing. Lazy routes are awaited via Suspense.
 */
describe('app routes render', () => {
  it.each(ROUTES)('renders %s', async (route, headline) => {
    window.localStorage.clear();
    render(
      <AppStoreProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[route]}>
            <App />
          </MemoryRouter>
        </ToastProvider>
      </AppStoreProvider>,
    );
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { level: 1, name: new RegExp(headline, 'i') })).toBeTruthy();
      },
      { timeout: 4000 },
    );
  });
});
