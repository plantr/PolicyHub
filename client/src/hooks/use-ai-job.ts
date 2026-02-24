import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AiJob {
  id: string;
  jobType: string;
  entityId: number;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  progressMessage: string | null;
  result: Record<string, any> | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useAiJob(jobId: string | null) {
  return useQuery<AiJob>({
    queryKey: ["/api/ai-jobs", jobId],
    queryFn: async () => {
      const res = await fetch(`/api/ai-jobs?jobId=${jobId}`);
      if (!res.ok) throw new Error("Failed to fetch job status");
      return res.json();
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed" || status === "cancelled") return false;
      return 2000; // Poll every 2 seconds while pending/processing
    },
  });
}

export function useCancelAiJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const res = await apiRequest("POST", `/api/ai-jobs?action=cancel&jobId=${jobId}`);
      return { jobId, ...(await res.json()) };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-jobs", data.jobId] });
    },
  });
}

// localStorage helpers for persisting job IDs across page refresh
const STORAGE_PREFIX = "ai-job:";

export function persistJobId(key: string, id: string) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, id);
  } catch { /* quota exceeded or private mode – ignore */ }
}

export function getPersistedJobId(key: string): string | null {
  try {
    return localStorage.getItem(STORAGE_PREFIX + key);
  } catch {
    return null;
  }
}

export function clearPersistedJobId(key: string) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch { /* ignore */ }
}
