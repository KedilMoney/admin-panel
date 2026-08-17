'use client';

import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBanks } from '@/lib/hooks/useBankMaster';
import type { BankMaster } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.kedil.money';

function resolveImageUrl(imageUrl?: string | null): string | undefined {
  if (!imageUrl) return undefined;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  const normalizedPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function BankOption({ bank }: { bank: BankMaster }) {
  const imageUrl = resolveImageUrl(bank.imageUrl);

  return (
    <span className="flex items-center gap-2">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          width={20}
          height={20}
          className="h-5 w-5 rounded object-contain"
          unoptimized
        />
      ) : (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[var(--muted)] text-[10px] font-semibold uppercase">
          {bank.shortName.slice(0, 2)}
        </span>
      )}
      <span>{bank.name}</span>
    </span>
  );
}

interface BankSelectFieldProps {
  value: string;
  onChange: (bankName: string) => void;
  disabled?: boolean;
  id?: string;
  allowAll?: boolean;
  allLabel?: string;
  label?: string;
}

export function BankSelectField({
  value,
  onChange,
  disabled,
  id = 'bankName',
  allowAll = false,
  allLabel = 'All banks',
  label = 'Issuing bank',
}: BankSelectFieldProps) {
  const { data: banks = [], isLoading } = useBanks();
  const selectedBank = banks.find((bank) => bank.name === value);
  const selectValue = value || (allowAll ? '__all__' : undefined);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={selectValue}
        onValueChange={(next) => onChange(next === '__all__' ? '' : next)}
        disabled={disabled || isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? 'Loading banks…' : 'Select your bank'}>
            {allowAll && !value ? (
              allLabel
            ) : selectedBank ? (
              <BankOption bank={selectedBank} />
            ) : (
              value || 'Select your bank'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {allowAll ? <SelectItem value="__all__">{allLabel}</SelectItem> : null}
          {banks.map((bank) => (
            <SelectItem key={bank.id} value={bank.name}>
              <BankOption bank={bank} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
