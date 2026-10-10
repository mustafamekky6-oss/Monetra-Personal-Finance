import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pencil, Receipt, Search, Trash2 } from 'lucide-react';
import { useAppStore, useCategoryLookup } from '@/store/AppStore';
import { useToast } from '@/store/ToastContext';
import { usePageMeta } from '@/components/layout/AppShell';
import { PageHeader, Amount } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, Input, Select } from '@/components/ui/FormControls';
import { TransactionFormModal } from '@/features/transactions/TransactionFormModal';
import { formatMoney } from '@/lib/format';
import { formatDate } from '@/lib/date';
import type { Transaction } from '@/types';

const PAGE_SIZE = 12;

type SortKey = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'date-desc', label: 'Newest first' },
  { value: 'date-asc', label: 'Oldest first' },
  { value: 'amount-desc', label: 'Amount: high to low' },
  { value: 'amount-asc', label: 'Amount: low to high' },
];

export default function TransactionsPage() {
  usePageMeta('Transactions');
  const { data, actions } = useAppStore();
  const { toast } = useToast();
  const categoryOf = useCategoryLookup();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  // Keep the search box in sync when a new query arrives via the topbar.
  useEffect(() => {
    setQuery(searchParams.get('q') ?? '');
    setPage(0);
  }, [searchParams]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [sort, setSort] = useState<SortKey>('date-desc');
  const [page, setPage] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>();
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const currency = data.preferences.currency;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = parseFloat(minAmount);
    let list = data.transactions.filter((t) => {
      if (q && !`${t.description} ${t.notes ?? ''} ${categoryOf(t.categoryId).name}`.toLowerCase().includes(q)) return false;
      if (categoryFilter !== 'all' && t.categoryId !== categoryFilter) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      if (!Number.isNaN(min) && t.amount < min) return false;
      return true;
    });
    list = list.slice().sort((a, b) => {
      switch (sort) {
        case 'date-asc':
          return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        default:
          return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
      }
    });
    return list;
  }, [data.transactions, query, categoryFilter, typeFilter, dateFrom, dateTo, minAmount, sort, categoryOf]);

  const pageCount = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const totals = useMemo(
    () => ({
      income: filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expenses: filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    }),
    [filtered],
  );

  const hasFilters = query || categoryFilter !== 'all' || typeFilter !== 'all' || dateFrom || dateTo || minAmount;

  const resetFilters = () => {
    setQuery('');
    setCategoryFilter('all');
    setTypeFilter('all');
    setDateFrom('');
    setDateTo('');
    setMinAmount('');
    setPage(0);
    setSearchParams({});
  };

  const dateFmt = (iso: string) => formatDate(iso, data.preferences.dateFormat);

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Ledger"
        title="Transactions"
        description="Search, filter and manage every record. Changes propagate to budgets, analytics and insights immediately."
        actions={
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
            withArrow
          >
            New transaction
          </Button>
        }
      />

      <Card padding="md" className="mb-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative md:col-span-2 xl:col-span-1">
            <label htmlFor="filter-search" className="sr-only">Search transactions</label>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input
              id="filter-search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search description, notes, category…"
              className="w-full rounded-(--radius-input) border border-lift/12 bg-field py-2.5 pl-9 pr-3 text-sm text-heading placeholder:text-muted focus:border-cyan-signal/60 focus:outline-none"
            />
          </div>
          <Field label="Category" htmlFor="filter-category">
            <Select
              id="filter-category"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">All categories</option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Type" htmlFor="filter-type">
            <Select
              id="filter-type"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">Income & expenses</option>
              <option value="income">Income only</option>
              <option value="expense">Expenses only</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From" htmlFor="filter-from">
              <Input id="filter-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </Field>
            <Field label="To" htmlFor="filter-to">
              <Input id="filter-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </Field>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Field label="Min amount" htmlFor="filter-min" className="w-32">
            <Input
              id="filter-min"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
            />
          </Field>
          <Field label="Sort" htmlFor="filter-sort" className="min-w-52">
            <Select id="filter-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
          )}
          <div className="ml-auto flex gap-4 font-mono text-[11px] uppercase tracking-[0.14em]">
            <span className="text-income">In {formatMoney(totals.income, currency)}</span>
            <span className="text-expense">Out {formatMoney(totals.expenses, currency)}</span>
            <span className="text-muted">{filtered.length} records</span>
          </div>
        </div>
      </Card>

      {data.transactions.length === 0 ? (
        <EmptyState
          icon={<Receipt size={28} aria-hidden />}
          title="No transactions recorded"
          description="This ledger is empty. Add your first income or expense record to power every view in Monetra."
          action={
            <Button onClick={() => setFormOpen(true)} withArrow>
              Record your first transaction
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No results for these filters"
          description="Try widening the date range or clearing filters."
          action={
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          {/* Table on lg+, stacked cards on small screens */}
          <Card padding="none" className="hidden overflow-hidden lg:block">
            <table className="w-full text-left">
              <caption className="sr-only">Filtered transactions, sorted</caption>
              <thead>
                <tr className="border-b border-lift/8">
                  {['Description', 'Category', 'Date', 'Method', 'Amount', ''].map((h) => (
                    <th key={h} scope="col" className="label-mono px-5 py-3.5 text-left text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-lift/6">
                {pageItems.map((t) => {
                  const cat = categoryOf(t.categoryId);
                  return (
                    <tr key={t.id} className="transition-colors duration-200 hover:bg-lift/4">
                      <td className="px-5 py-3.5">
                        <button type="button" onClick={() => setDetail(t)} className="text-left">
                          <span className="text-sm text-heading hover:underline">{t.description}</span>
                          {t.recurringId && (
                            <span className="ml-2 align-middle">
                              <Badge tone="chromatic">Recurring</Badge>
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-2 text-sm text-body">
                          <CategoryIcon name={cat.icon} size={14} />
                          {cat.name}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs tabular-nums text-body">{dateFmt(t.date)}</td>
                      <td className="px-5 py-3.5 text-sm capitalize text-muted">{t.paymentMethod.replace('-', ' ')}</td>
                      <td className="px-5 py-3.5">
                        <Amount type={t.type} value={formatMoney(t.amount, currency, { signed: true })} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(t);
                              setFormOpen(true);
                            }}
                            aria-label={`Edit ${t.description}`}
                            className="rounded p-1.5 text-muted transition-colors duration-200 hover:bg-lift/10 hover:text-heading"
                          >
                            <Pencil size={15} aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(t)}
                            aria-label={`Delete ${t.description}`}
                            className="rounded p-1.5 text-muted transition-colors duration-200 hover:bg-orchid-bloom/15 hover:text-expense"
                          >
                            <Trash2 size={15} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Mobile card list */}
          <div className="flex flex-col gap-2.5 lg:hidden">
            {pageItems.map((t) => {
              const cat = categoryOf(t.categoryId);
              return (
                <Card key={t.id} padding="md" surface="plain" className="bg-card">
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" onClick={() => setDetail(t)} className="min-w-0 text-left">
                      <p className="truncate text-sm text-heading">{t.description}</p>
                      <p className="mt-1 font-mono text-[11px] text-muted">
                        {dateFmt(t.date)} · {cat.name}
                        {t.recurringId ? ' · recurring' : ''}
                      </p>
                    </button>
                    <Amount type={t.type} value={formatMoney(t.amount, currency, { signed: true })} className="shrink-0" />
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => {
                        setEditing(t);
                        setFormOpen(true);
                      }}
                      aria-label={`Edit ${t.description}`}
                    >
                      <Pencil size={14} aria-hidden /> Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleting(t)} aria-label={`Delete ${t.description}`}>
                      <Trash2 size={14} aria-hidden /> Delete
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              Page {safePage + 1} of {pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="glass"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={14} aria-hidden /> Prev
              </Button>
              <Button
                variant="glass"
                size="sm"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage(safePage + 1)}
                aria-label="Next page"
              >
                Next <ChevronRight size={14} aria-hidden />
              </Button>
            </div>
          </div>
        </>
      )}

      <TransactionFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(undefined);
        }}
        editing={editing}
      />

      <Modal open={detail !== null} onClose={() => setDetail(null)} title="Transaction detail">
        {detail && (
          <dl className="space-y-3.5 text-sm">
            <DetailRow label="Description" value={detail.description} />
            <DetailRow
              label="Amount"
              value={
                <Amount type={detail.type} value={formatMoney(detail.amount, currency, { signed: true })} />
              }
            />
            <DetailRow label="Category" value={categoryOf(detail.categoryId).name} />
            <DetailRow label="Date" value={dateFmt(detail.date)} />
            <DetailRow label="Payment method" value={detail.paymentMethod.replace('-', ' ')} />
            <DetailRow label="Recurring" value={detail.recurringId ? 'Yes — generated from a schedule' : 'No'} />
            <DetailRow label="Notes" value={detail.notes ?? '—'} />
          </dl>
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete transaction"
        message={`This permanently removes "${deleting?.description}" (${formatMoney(deleting?.amount ?? 0, currency)}). Budgets, analytics and insights will recalculate immediately.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleting) {
            actions.deleteTransaction(deleting.id);
            toast('Transaction deleted.');
          }
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-lift/6 pb-3 last:border-0">
      <dt className="label-mono pt-1 text-muted">{label}</dt>
      <dd className="text-right text-heading">{value}</dd>
    </div>
  );
}
