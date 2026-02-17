import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useRequirements() {
  return useQuery({
    queryKey: [api.requirements.list.path],
    queryFn: async () => {
      const res = await fetch(api.requirements.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch requirements");
      return api.requirements.list.responses[200].parse(await res.json());
    },
  });
}
