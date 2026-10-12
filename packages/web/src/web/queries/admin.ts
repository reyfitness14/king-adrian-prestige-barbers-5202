import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orpc } from '../lib/api';
export function useAdminMe(enabled: boolean) { return useQuery(orpc.admin.me.queryOptions({ enabled, retry: false })); }
export function useAdminCatalog() { return useQuery(orpc.admin.list.queryOptions()); }
export function useAdminSchedules() { return useQuery(orpc.admin.schedules.queryOptions()); }
export function useAdminLogs() { return useQuery(orpc.admin.logs.queryOptions()); }
export function useAppointments(from: string, to: string, search: string) { return useQuery(orpc.admin.appointments.queryOptions({ input: { from, to, search } })); }
export function useAdminActions() {
  const cache = useQueryClient();
  const invalidate = () => { void cache.invalidateQueries(); };
  return {
    service: useMutation(orpc.admin.serviceSave.mutationOptions({ onSuccess: invalidate })),
    barber: useMutation(orpc.admin.barberSave.mutationOptions({ onSuccess: invalidate })),
    settings: useMutation(orpc.admin.settingsSave.mutationOptions({ onSuccess: invalidate })),
    content: useMutation(orpc.admin.contentSave.mutationOptions({ onSuccess: invalidate })),
    schedule: useMutation(orpc.admin.scheduleSave.mutationOptions({ onSuccess: invalidate })),
    exception: useMutation(orpc.admin.exceptionSave.mutationOptions({ onSuccess: invalidate })),
    removeException: useMutation(orpc.admin.exceptionDelete.mutationOptions({ onSuccess: invalidate })),
    appointment: useMutation(orpc.admin.appointmentChange.mutationOptions({ onSuccess: invalidate })),
    upload: useMutation(orpc.admin.upload.mutationOptions()),
  };
}