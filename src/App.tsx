import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { useAppStore } from './store/AppStore';
import ExercisesPage from './pages/ExercisesPage';
import SessionPage from './pages/SessionPage';
import TimerPage from './pages/TimerPage';
import SettingsPage from './pages/SettingsPage';
import { SessionSummary } from './pages/session/SessionSummary';

// Charts are the heaviest dependency, so analytics loads on demand.
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));

export default function App() {
  const { ready } = useAppStore();
  if (!ready) return null;
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/exercises" replace />} />
          <Route path="/exercises" element={<ExercisesPage />} />
          <Route path="/session" element={<SessionPage />} />
          <Route path="/session/summary/:id" element={<SessionSummary />} />
          <Route path="/timer" element={<TimerPage />} />
          <Route
            path="/analytics"
            element={
              <Suspense fallback={<main className="main" />}>
                <AnalyticsPage />
              </Suspense>
            }
          />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/exercises" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
