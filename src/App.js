import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./Dashboard";
import GraficasOtroArea from "./GraficasOtroArea"; // <- asegúrate que exista

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route
  path="/pmp"
  element={
    <GraficasOtroArea
    
    />
  }
/>
      </Routes>
    </Router>
  );
}

export default App;

