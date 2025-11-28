'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { BankMaster } from '@/types';
import { AlertCircle } from 'lucide-react';

interface MigrateBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankToDelete: BankMaster | null;
  availableBanks: BankMaster[];
  accountsCount: number;
  onConfirm: (migrateToBankId: number) => Promise<void>;
  isDeleting?: boolean;
}

export function MigrateBankDialog({
  open,
  onOpenChange,
  bankToDelete,
  availableBanks,
  accountsCount,
  onConfirm,
  isDeleting = false,
}: MigrateBankDialogProps) {
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Filter out the bank being deleted from available options
  const targetBanks = availableBanks.filter(
    (bank) => bank.id !== bankToDelete?.id
  );

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedBankId('');
      setError('');
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!selectedBankId) {
      setError('Please select a target bank to migrate accounts to');
      return;
    }

    setError('');
    try {
      await onConfirm(parseInt(selectedBankId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete bank with migration');
    }
  };

  if (!bankToDelete) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Migrate Accounts Before Deletion
          </DialogTitle>
          <DialogDescription>
            This bank has <strong>{accountsCount}</strong> associated account(s).
            Please select a target bank to migrate all accounts to before deletion.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="target-bank">
              Select Target Bank <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedBankId}
              onValueChange={(value) => {
                setSelectedBankId(value);
                setError('');
              }}
              disabled={isDeleting}
            >
              <SelectTrigger id="target-bank">
                <SelectValue placeholder="Choose a bank to migrate accounts to..." />
              </SelectTrigger>
              <SelectContent>
                {targetBanks.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-[var(--muted-foreground)]">
                    No other banks available
                  </div>
                ) : (
                  targetBanks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{bank.name}</span>
                        {bank.shortName && (
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {bank.shortName}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            {targetBanks.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">
                Cannot delete this bank. You need at least one other bank to migrate accounts to.
              </p>
            )}
          </div>

          <div className="rounded-md bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-3">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <strong>Warning:</strong> All {accountsCount} account(s) associated with{' '}
              <strong>{bankToDelete.name}</strong> will be migrated to the selected bank.
              This action cannot be undone.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedBankId || targetBanks.length === 0 || isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? 'Deleting...' : 'Delete & Migrate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

