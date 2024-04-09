import { createRoot } from "react-dom/client";
import Navbar from "./components/navbar";
import RadioContainer from "./components/radio-container";
import Sidebar from "./components/sidebar";

function App() {
  return (
    <>
      <Navbar />
      <div className="structure">
        <RadioContainer />
        <Sidebar />
      </div>
    </>
  );
}

const root = createRoot(document.body);
root.render(<App />);
