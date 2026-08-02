import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ExplorerPage from './features/explorer/ExplorerPage'
import DashboardPage from './features/dashboards/DashboardPage'
import ReportBuilderPage from './features/report_builder/ReportBuilderPage'
import SyncPage from './features/sync/SyncPage'
import { ScoringPage } from './features/settings/ScoringPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen overflow-hidden bg-surface-900 print:h-auto print:overflow-visible">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 pb-10 print:p-0 print:overflow-visible">
          <div className="max-w-[1600px] mx-auto w-full h-full print:h-auto">
            <Routes>
              <Route path="/explorer" element={<ExplorerPage />} />
              <Route path="/dashboards" element={<DashboardPage />} />
              <Route path="/reports" element={<ReportBuilderPage />} />
              <Route path="/sync" element={<SyncPage />} />
              <Route path="/settings/scoring" element={<ScoringPage />} />
              <Route path="*" element={<Navigate to="/explorer" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  )
}
