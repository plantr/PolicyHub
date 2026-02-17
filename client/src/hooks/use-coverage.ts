import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useCoverage() {
  return useQuery({
    queryKey: [api.coverage.list.path],
    queryFn: async () => {
      const res = await fetch(api.coverage.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch coverage data");
      return api.coverage.list.responses[200].parse(await res.json());
    },
  });
}
