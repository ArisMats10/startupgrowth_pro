import React from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import Routes from "./Routes";
import Footer from "./components/ui/Footer";

function AppLayout() {
  const location = useLocation();
  const hideFooter = location?.pathname === "/business-plan-generator";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex-1">
        <Routes />
      </div>
      {!hideFooter ? <Footer /> : null}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
