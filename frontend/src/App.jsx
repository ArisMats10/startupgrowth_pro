import React from "react";
import Routes from "./Routes";
import Footer from "./components/ui/Footer";

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex-1">
        <Routes />
      </div>
      <Footer />
    </div>
  );
}

export default App;
