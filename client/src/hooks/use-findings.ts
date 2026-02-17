import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { InsertFinding } from "@shared/schema";

export function useFindings() {
  return useQuery({
    queryKey: [api.findings.list.path],
    queryFn: async () => {
      const res = await fetch(api.findings.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch findings");
      return api.findings.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateFinding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertFinding) => {
      const res = await fetch(api.findings.create.path, {
        method: api.findings.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create finding");
      return api.findings.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.findings.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
    },
  });
}
