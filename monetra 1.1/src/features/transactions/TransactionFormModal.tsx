import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { PaymentMethod, Transaction } from '@/types';
import { useAppStore } from '@/store/AppStore';
import { useToast } from '@/store/ToastContext';
import { todayISO } from '@/lib/date';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/FormControls';
import { Modal } from '@/components/ui/Modal';

const schema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z
    .coerce.number({ invalid_type_error: 'Enter a valid amount' })
    .positive('Amount must be greater than zero')
    .max(1_000_000_000, 'Amount is unrealistically large'),
  categoryId: z.string().min(1, 'Choose a category'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date'),
  description: z.string().trim().min(2, 'Describe the transaction (min 2 characters)').max(120, 'Keep it under 120 characters'),
  paymentMethod: z.enum(['card', 'cash', 'bank-transfer', 'direct-debit', 'other']),
  notes: z.string().trim().max(280, 'Keep notes under 280 characters').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface TransactionFormModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided the form edits instead of creating. */
  editing?: Transaction;
  /** Pre-filled type for quick actions. */
  defaultType?: 'income' | 'expense';
}

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank-transfer', label: 'Bank transfer' },
  { value: 'direct-debit', label: 'Direct debit' },
  { value: 'other', label: 'Other' },
];

export function TransactionFormModal({ open, onClose, editing, defaultType = 'expense' }: TransactionFormModalProps) {
  const { data, actions } = useAppStore();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: defaultType,
      amount: NaN as unknown as number,
      categoryId: '',
      date: todayISO(),
      description: '',
      paymentMethod: 'card',
      notes: '',
    },
  });

  const type = watch('type');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      reset({
        type: editing.type,
        amount: editing.amount,
        categoryId: editing.categoryId,
        date: editing.date,
        description: editing.description,
        paymentMethod: editing.paymentMethod,
        notes: editing.notes ?? '',
      });
    } else {
      reset({
        type: defaultType,
        amount: NaN as unknown as number,
        categoryId: '',
        date: todayISO(),
        description: '',
        paymentMethod: 'card',
        notes: '',
      });
    }
  }, [open, editing, defaultType, reset]);

  const categoriesForType = data.categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense'));

  const onSubmit = handleSubmit(async (values) => {
    let categoryId = values.categoryId;
    if (!categoriesForType.some((c) => c.id === categoryId)) {
      categoryId = categoriesForType[0]?.id ?? '';
    }
    const payload = {
      type: values.type,
      amount: Math.round(values.amount * 100) / 100,
      categoryId,
      date: values.date,
      description: values.description.trim(),
      paymentMethod: values.paymentMethod,
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
    };
    if (editing) {
      actions.updateTransaction(editing.id, payload);
      toast('Transaction updated.');
    } else {
      actions.addTransaction(payload);
      toast(`${values.type === 'income' ? 'Income' : 'Expense'} recorded.`);
    }
    onClose();
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit transaction' : 'New transaction'}
      description="Records are stored locally in your browser."
      wide
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="mb-5 inline-flex rounded-(--radius-input) border border-lift/12 p-1" role="radiogroup" aria-label="Transaction type">
          {(['expense', 'income'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={type === option}
              onClick={() => setValue('type', option)}
              className={`rounded-[6px] px-5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors duration-200 ${
                type === option ? 'bg-action text-on-action' : 'text-body hover:text-heading'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount" htmlFor="tx-amount" error={errors.amount?.message}>
            <Input
              id="tx-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              aria-invalid={!!errors.amount}
              {...register('amount')}
            />
          </Field>
          <Field label="Date" htmlFor="tx-date" error={errors.date?.message}>
            <Input id="tx-date" type="date" aria-invalid={!!errors.date} {...register('date')} />
          </Field>
          <Field label="Category" htmlFor="tx-category" error={errors.categoryId?.message}>
            <Select id="tx-category" aria-invalid={!!errors.categoryId} {...register('categoryId')}>
              <option value="" disabled>
                Select a category
              </option>
              {categoriesForType.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Payment method" htmlFor="tx-method" error={errors.paymentMethod?.message}>
            <Select id="tx-method" {...register('paymentMethod')}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description" htmlFor="tx-desc" error={errors.description?.message} className="sm:col-span-2">
            <Input
              id="tx-desc"
              placeholder={type === 'income' ? 'e.g. Monthly salary' : 'e.g. GreenMarket run'}
              aria-invalid={!!errors.description}
              {...register('description')}
            />
          </Field>
          <Field label="Notes (optional)" htmlFor="tx-notes" error={errors.notes?.message} className="sm:col-span-2">
            <Textarea id="tx-notes" placeholder="Anything worth remembering about this record" {...register('notes')} />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} withArrow>
            {editing ? 'Save changes' : 'Record transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
