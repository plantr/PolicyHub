import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useBusinessUnits() {
  return useQuery({
    queryKey: [api.businessUnits.list.path],
    queryFn: async () => {
      const res = await fetch(api.businessUnits.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch business units");
      return api.businessUnits.list.responses[200].parse(await res.json());
    },
  });
}

export function useBusinessUnit(id: number) {
  return useQuery({
    queryKey: [api.businessUnits.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.businessUnits.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch business unit");
      return api.businessUnits.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}
