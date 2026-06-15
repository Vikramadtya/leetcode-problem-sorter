import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useSession } from './contexts/AuthContext';
import GlobalAudioListener from './components/GlobalAudioListener';
import OfflineBanner from './components/OfflineBanner';
import ParticlesBackground from './components/ParticlesBackground';
import { ErrorBoundary } from './components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Lazy loaded pages
const Tracker = lazy(() => import('./pages/Tracker'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Explore = lazy(() => import('./pages/Explore'));
const Configuration = lazy(() => import('./pages/Configuration'));
const Comments = lazy(() => import('./pages/Comments'));
const About = lazy(() => import('./pages/About'));
const Add = lazy(() => import('./pages/Add'));

const AuthGuard = ({ children }) => {
  const { status } = useSession();
  if (status === 'loading') return null;
  if (status === 'unauthenticated') return <Navigate to="/" />;
  return children;
};


const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id';

// Fallback spinner for lazy loaded routes
const PageFallback = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100%',
    }}
  >
    <div
      style={{
        width: '40px',
        height: '40px',
        border: '4px solid var(--border-color)',
        borderTopColor: 'var(--brand-main)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
  </div>
);


export default function App() {
  return (
    <HelmetProvider>
      <GoogleOAuthProvider clientId={clientId}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
            <AuthProvider>
              <Router>
              <ErrorBoundary>
                <div className="app-content">
                  <Toaster position="bottom-right" reverseOrder={false} />
                  <OfflineBanner />
                  <GlobalAudioListener />
                  <ParticlesBackground />
                  <Suspense fallback={<PageFallback />}>
                    <Routes>
                      <Route path="/" element={<Tracker />} />
                      <Route
                        path="/dashboard"
                        element={
                          <AuthGuard>
                            <Dashboard />
                          </AuthGuard>
                        }
                      />
                      <Route
                        path="/explore"
                        element={
                          <AuthGuard>
                            <Explore />
                          </AuthGuard>
                        }
                      />
                      <Route
                        path="/configuration"
                        element={
                          <AuthGuard>
                            <Configuration />
                          </AuthGuard>
                        }
                      />
                      <Route
                        path="/comments"
                        element={
                          <AuthGuard>
                            <Comments />
                          </AuthGuard>
                        }
                      />
                      <Route path="/about" element={<About />} />
                      <Route
                        path="/add"
                        element={
                          <AuthGuard>
                            <Add />
                          </AuthGuard>
                        }
                      />
                    </Routes>
                  </Suspense>
                </div>
              </ErrorBoundary>
              </Router>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </GoogleOAuthProvider>
    </HelmetProvider>
  );
}
