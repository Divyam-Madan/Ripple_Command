import { api } from "./client";
import type { CopilotResponse } from "@/types";

export const askCopilot = (message: string) => api.post<CopilotResponse>("/copilot/query", { message });
