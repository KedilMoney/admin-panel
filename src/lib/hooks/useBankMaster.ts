import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bankMasterApi } from '@/lib/api/bankMaster';
import { BankMaster } from '@/types';

export const useBanks = () => {
  return useQuery({
    queryKey: ['banks'],
    queryFn: () => bankMasterApi.getAll(),
  });
};

export const useBank = (id: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['bank', id],
    queryFn: () => bankMasterApi.getById(id),
    enabled: enabled && !!id,
  });
};

export const useCreateBank = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: FormData) => bankMasterApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
    },
  });
};

export const useUpdateBank = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: FormData }) => bankMasterApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
    },
  });
};

export const useDeleteBank = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, migrateToBankId }: { id: number; migrateToBankId?: number }) => 
      bankMasterApi.delete(id, migrateToBankId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
    },
  });
};

