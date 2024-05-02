import { createRoot } from "react-dom/client";
import Navbar from "./components/navbar";
import RadioContainer from "./components/radio/radio-container";
import Sidebar from "./components/sidebar/sidebar";
import ErrorDialog from "./components/error";
import Bootstrap from "./components/bootstrap";

import "./style/app.scss";
import Mini from "./components/mini";

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
