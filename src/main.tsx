import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MapWorkspace } from '../app/map-workspace';
import '../app/globals.css';
import 'leaflet/dist/leaflet.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><MapWorkspace /></StrictMode>,
);
