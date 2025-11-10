import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api/users';
import { User } from '@/types';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });
};

export const useUserByEmail = (email: string, enabled: boolean = false) => {
  return useQuery({
    queryKey: ['user', email],
    queryFn: () => usersApi.getByEmail(email),
    enabled,
  });
};

