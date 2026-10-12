import { useMutation, useQuery } from '@tanstack/react-query';
import { orpc } from '../lib/api';
export function useCatalog() { return useQuery(orpc.booking.catalog.queryOptions({ staleTime: 15000, refetchInterval: 15 * 60000 })); }
export function useCreateBooking() { return useMutation(orpc.booking.create.mutationOptions()); }
export function useAvailability(serviceId: string, barberId: string, date: string) {
  return useQuery(orpc.booking.availability.queryOptions({ input: { serviceId, barberId, date }, enabled: Boolean(serviceId && barberId && date), staleTime: 30000 }));
}