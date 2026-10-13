import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { CATEGORIES, createItemSchema, type AdminItem, type CreateItemInput } from '@iitr/shared';
import { api, errorMessage } from '../../api/client';
import { Field, fieldProps } from '../../components/Field';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import { validate, type FieldErrors } from '../../lib/forms';

type FormValues = { name: string; description: string; category: string; price: string; imageUrl: string; stock: string; isActive: boolean };

const EMPTY: FormValues = { name: '', description: '', category: '', price: '', imageUrl: '', stock: '0', isActive: true };

function toForm(item: AdminItem): FormValues {
  return { ...item, stock: String(item.stock) };
}

/** Create (item = null) or edit an item. Calls onSaved with the server's copy. */
export function ItemFormModal({
  open,
  item,
  onClose,
  onSaved,
}: {
  open: boolean;
  item: AdminItem | null;
  onClose: () => void;
  onSaved: (item: AdminItem) => void;
}) {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<CreateItemInput>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(item ? toForm(item) : EMPTY);
      setErrors({});
    }
  }, [open, item]);

  const set = (key: keyof FormValues) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = key === 'isActive' ? (e.target as HTMLInputElement).checked : e.target.value;
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const stock = values.stock.trim() === '' ? NaN : Number(values.stock);
    const { data, errors } = validate(createItemSchema, { ...values, stock });
    if (errors) return setErrors(errors);

    setSaving(true);
    try {
      const { item: saved } = item
        ? await api<{ item: AdminItem }>(`/admin/items/${item.id}`, { method: 'PATCH', body: data })
        : await api<{ item: AdminItem }>('/admin/items', { method: 'POST', body: data });
      toast.success(item ? `${saved.name} updated` : `${saved.name} added`);
      onSaved(saved);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={saving ? () => {} : onClose} title={item ? `Edit ${item.name}` : 'Add item'} size="lg">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field id="name" label="Name" error={errors.name}>
          <input {...fieldProps('name', errors.name)} className="input" value={values.name} onChange={set('name')} />
        </Field>
        <Field id="description" label="Description" error={errors.description}>
          <textarea
            {...fieldProps('description', errors.description)}
            rows={2}
            className="input resize-none"
            value={values.description}
            onChange={set('description')}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="category" label="Category" error={errors.category}>
            <select {...fieldProps('category', errors.category)} className="input" value={values.category} onChange={set('category')}>
              <option value="" disabled>
                Select
              </option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field id="price" label="Price (₹)" error={errors.price}>
            <input
              {...fieldProps('price', errors.price)}
              inputMode="decimal"
              placeholder="e.g. 45.00"
              className="input"
              value={values.price}
              onChange={set('price')}
            />
          </Field>
          <Field id="stock" label="Stock" error={errors.stock}>
            <input {...fieldProps('stock', errors.stock)} type="number" min={0} className="input" value={values.stock} onChange={set('stock')} />
          </Field>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <Field id="imageUrl" label="Image URL" error={errors.imageUrl}>
              <input
                {...fieldProps('imageUrl', errors.imageUrl)}
                type="url"
                placeholder="https://…"
                className="input"
                value={values.imageUrl}
                onChange={set('imageUrl')}
              />
            </Field>
          </div>
          {values.imageUrl.startsWith('http') && (
            <img src={values.imageUrl} alt="" className="mt-6 size-16 shrink-0 rounded-lg bg-slate-100 object-cover" />
          )}
        </div>
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input type="checkbox" className="size-4 accent-brand-700" checked={values.isActive} onChange={set('isActive')} />
          On sale (visible to students)
        </label>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Spinner className="size-4" />}
            {item ? 'Save changes' : 'Add item'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
