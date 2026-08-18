import { createBrowserRouter } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import DashboardPage from '@/features/dashboard/DashboardPage';
import DigitalTwinPage from '@/features/digital-twin/DigitalTwinPage';
import ShipmentsPage from '@/features/shipments/ShipmentsPage';
import DisruptionsPage from '@/features/disruptions/DisruptionsPage';
import SimulationPage from '@/features/simulation/SimulationPage';
import AnalyticsPage from '@/features/analytics/AnalyticsPage';
import ScenariosPage from '@/features/scenarios/ScenariosPage';
import EntitiesPage from '@/features/entities/EntitiesPage';
import AdminPage from '@/features/admin/AdminPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'digital-twin', element: <DigitalTwinPage /> },
      { path: 'shipments', element: <ShipmentsPage /> },
      { path: 'disruptions', element: <DisruptionsPage /> },
      { path: 'simulation', element: <SimulationPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'scenarios', element: <ScenariosPage /> },
      { path: 'entities', element: <EntitiesPage /> },
    ],
  },
  { path: '/admin', element: <AdminPage /> },
]);
