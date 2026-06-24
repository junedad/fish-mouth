import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// Pas de <StrictMode> : éviterait un double-montage des effets (créerait deux simulations).
createRoot(document.getElementById("root")).render(<App />);
