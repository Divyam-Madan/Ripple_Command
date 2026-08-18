import { api } from "./client";
import type { ShipmentItem } from "@/types";

export const listShipments = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return api.get<{ items: ShipmentItem[] }>(`/shipments${qs ? `?${qs}` : ""}`);
};
