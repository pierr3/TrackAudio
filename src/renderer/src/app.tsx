import { createRoot } from "react-dom/client";
import Navbar from "./components/navbar";
import RadioContainer from "./components/radio/radio-container";
import Sidebar from "./components/sidebar/sidebar";
import ErrorDialog from "./components/error";
import Bootstrap from "./components/bootstrap";
import Mini from "./components/mini";
import * as Sentry from "@sentry/electron/renderer";
import { init as reactInit } from "@sentry/react";

import "./index.scss"
import "./style/app.scss";

window.api
  .ShouldEnableTelemetryInTheRenderer()
  .then((enable: boolean) => {
    if (enable) {
      Sentry.init(
        {
          dsn: "https://79ff6300423d5708cae256665d170c4b@o4507193732169728.ingest.de.sentry.io/4507193745145936",
          sendDefaultPii: false,
        },
        // eslint-disable-next-line
        reactInit,
      );
    }
  })
  .catch((e: unknown) => {
    console.error("Failed to get config and set telemetry status", e);
  });

function App() {
  return (
    <>
      <Bootstrap />
      <Navbar />
      <ErrorDialog />
      <div className="structure">
        <Mini />
        <RadioContainer />
        <Sidebar />
      </div>
    </>
  );
}

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
} else {
  console.error("Could not find element with id 'root'");
}
