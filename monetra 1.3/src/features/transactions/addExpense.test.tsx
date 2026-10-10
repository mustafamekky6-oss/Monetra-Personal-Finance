import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';
import { AppStoreProvider } from '@/store/AppStore';
import { ToastProvider } from '@/store/ToastContext';

afterEach(cleanup);

/** End-to-end flow: dashboard quick action → add expense → persisted + UI updated. */
describe('add expense flow', () => {
  it('records an expense from the quick action tile', async () => {
    window.localStorage.clear();
    render(
      <AppStoreProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={['/app']}>
            <App />
          </MemoryRouter>
        </ToastProvider>
      </AppStoreProvider>,
    );

    // Open the modal via the quick action tile.
    const tile = await screen.findByRole('button', { name: /add expense/i });
    fireEvent.click(tile);

    // The dialog appears with its form.
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeTruthy();

    const before = JSON.parse(window.localStorage.getItem('monetra.data.v1') ?? '{}')
      .transactions.length as number;

    const scope = within(dialog);
    fireEvent.change(scope.getByLabelText(/amount/i), { target: { value: '42.50' } });
    fireEvent.change(scope.getByLabelText(/description/i), { target: { value: 'Test coffee run' } });
    fireEvent.change(scope.getByLabelText(/^category$/i), { target: { value: 'cat-dining' } });
    fireEvent.click(scope.getByRole('button', { name: /record transaction/i }));

    await waitFor(() => {
      expect(screen.getByText(/expense recorded/i)).toBeTruthy();
    });

    const after = JSON.parse(window.localStorage.getItem('monetra.data.v1') ?? '{}')
      .transactions.length as number;
    expect(after).toBeGreaterThan(before);

    // The new record shows up in recent activity.
    await waitFor(() => {
      expect(screen.getByText('Test coffee run')).toBeTruthy();
    });
  });
});
