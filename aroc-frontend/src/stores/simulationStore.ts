import { create } from 'zustand';
import type { SimulationResult, RecoveryOption } from '@/types';

interface SimulationStore {
  selectedSupplierId: number | null;
  disruptionType: string;
  delayHours: number;
  isRunning: boolean;
  result: SimulationResult | null;
  recoveryOptions: RecoveryOption[];
  isOptimizing: boolean;
  setSelectedSupplier: (id: number) => void;
  setDelayHours: (h: number) => void;
  setDisruptionType: (t: string) => void;
  setRunning: (v: boolean) => void;
  setResult: (r: SimulationResult | null) => void;
  setRecoveryOptions: (opts: RecoveryOption[]) => void;
  setOptimizing: (v: boolean) => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  selectedSupplierId: null,
  disruptionType: 'supplier_delay',
  delayHours: 12,
  isRunning: false,
  result: null,
  recoveryOptions: [],
  isOptimizing: false,
  setSelectedSupplier: (id) => set({ selectedSupplierId: id }),
  setDelayHours: (h) => set({ delayHours: h }),
  setDisruptionType: (t) => set({ disruptionType: t }),
  setRunning: (v) => set({ isRunning: v }),
  setResult: (r) => set({ result: r }),
  setRecoveryOptions: (opts) => set({ recoveryOptions: opts }),
  setOptimizing: (v) => set({ isOptimizing: v }),
  reset: () => set({ result: null, recoveryOptions: [], isRunning: false }),
}));
