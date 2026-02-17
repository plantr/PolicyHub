import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type CreatePolicyRequest, type UpdatePolicyRequest } from "@shared/schema";

// GET /api/policies
export function usePolicies(filters?: { businessUnitId?: string; status?: string }) {
  const queryKey = [api.policies.list.path, filters];
  return useQuery({
    queryKey,
    queryFn: async () => {
      // Build query string manually or use URLSearchParams if needed
      let url = api.policies.list.path;
      if (filters) {
        const params = new URLSearchParams();
        if (filters.businessUnitId) params.append("businessUnitId", filters.businessUnitId);
        if (filters.status) params.append("status", filters.status);
        if (params.toString()) url += `?${params.toString()}`;
      }

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch policies");
      return api.policies.list.responses[200].parse(await res.json());
    },
  });
}

// GET /api/policies/:id
export function usePolicy(id: number) {
  return useQuery({
    queryKey: [api.policies.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.policies.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch policy");
      return api.policies.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

// POST /api/policies
export function useCreatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePolicyRequest) => {
      const res = await fetch(api.policies.create.path, {
        method: api.policies.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create policy");
      return api.policies.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.policies.list.path] });
    },
  });
}

// PUT /api/policies/:id
export function useUpdatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & UpdatePolicyRequest) => {
      const url = buildUrl(api.policies.update.path, { id });
      const res = await fetch(url, {
        method: api.policies.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update policy");
      return api.policies.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.policies.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.policies.get.path, variables.id] });
    },
  });
}
