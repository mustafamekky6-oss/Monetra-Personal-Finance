import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import './index.css';
import { AppStoreProvider } from '@/store/AppStore';
import { ToastProvider } from '@/store/ToastContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppStoreProvider>
      <ToastProvider>
        <RouterProvider router={createBrowserRouter([{ path: '*', element: <App /> }])} />
      </ToastProvider>
    </AppStoreProvider>
  </React.StrictMode>,
);
