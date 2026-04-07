import { Suspense } from 'react';
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter basename={__BASE_PATH__}>
        <Suspense fallback={
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a0a0c] font-['Montserrat']">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-emerald-500/20 rounded-full animate-ping"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="mt-8 text-[11px] font-black text-white uppercase tracking-[0.4em] animate-pulse">Initializing System...</h2>
          </div>
        }>
          <AppRoutes />
        </Suspense>
      </BrowserRouter>
    </I18nextProvider>
  );
}

export default App;
