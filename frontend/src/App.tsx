import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ExplorerPage from './features/explorer/ExplorerPage'
import DashboardPage from './features/dashboards/DashboardPage'
import ReportBuilderPage from './features/report_builder/ReportBuilderPage'
import SyncPage from './features/sync/SyncPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen overflow-hidden bg-surface-900">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 print:p-0">
          <div className="max-w-[1600px] mx-auto w-full h-full">
            <Routes>
              <Route path="/explorer" element={<ExplorerPage />} />
              <Route path="/dashboards" element={<DashboardPage />} />
              <Route path="/reports" element={<ReportBuilderPage />} />
              <Route path="/sync" element={<SyncPage />} />
              <Route path="*" element={<Navigate to="/explorer" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  )
}
