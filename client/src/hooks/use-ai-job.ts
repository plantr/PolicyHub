import { useQuery } from "@tanstack/react-query";

interface AiJob {
  id: string;
  jobType: string;
  entityId: number;
  status: "pending" | "processing" | "completed" | "failed";
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
      const res = await fetch(`/api/ai-jobs/${jobId}`);
      if (!res.ok) throw new Error("Failed to fetch job status");
      return res.json();
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      return 2000; // Poll every 2 seconds while pending/processing
    },
  });
}
