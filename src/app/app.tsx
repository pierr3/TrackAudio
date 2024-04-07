import { createRoot } from "react-dom/client";
import Navbar from "./components/navbar";

function App() {
  return <Navbar version={""} />;
}

const root = createRoot(document.body);
root.render(<App />);
