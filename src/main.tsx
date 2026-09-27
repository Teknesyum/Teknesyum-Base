import React from "react";
import ReactDOM from "react-dom/client";
import "../teknesyum-ui/css/theme.css";
import "../teknesyum-ui/css/a11y.css";
import "../teknesyum-ui/css/forms.css";
import "../teknesyum-ui/css/states.css";
import "./styles/app.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
