import { Route, Routes } from "react-router-dom";

import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { DigitalTwinPage } from "@/features/digital-twin/DigitalTwinPage";
import { ShipmentsPage } from "@/features/shipments/ShipmentsPage";
import { SimulationPage } from "@/features/simulation/SimulationPage";
import { DisruptionsPage } from "@/features/disruptions/DisruptionsPage";
import { AnalyticsPage } from "@/features/analytics/AnalyticsPage";
import { ScenariosPage } from "@/features/scenarios/ScenariosPage";
import { AdminPage } from "@/features/admin/AdminPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/digital-twin" element={<DigitalTwinPage />} />
      <Route path="/shipments" element={<ShipmentsPage />} />
      <Route path="/simulator" element={<SimulationPage />} />
      <Route path="/disruptions" element={<DisruptionsPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/scenarios" element={<ScenariosPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}
