import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './ErrorBoundary';
import {initializeThemes} from './theme';
import './styles.css';
import './interaction.css';
import './mobile-detail.css';
import './accessibility.css';
import './final-polish.css';
import './themes.css';
import './theme-aliases.css';
import './release-polish.css';

initializeThemes();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ErrorBoundary><App/></ErrorBoundary></React.StrictMode>
);
