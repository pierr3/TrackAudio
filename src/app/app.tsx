import { createRoot } from "react-dom/client";
import Navbar from "./components/navbar";

function App() {
  return (
    <div className="container">
      <Navbar version={""} />
    </div>
  );
}

const root = createRoot(document.body);
root.render(<App />);
