import LoginScreen from "./components/LoginScreen";
import AppShell from "./components/AppShell";
import Overlays from "./components/Overlays";

export default function App() {
  return (
    <div className="app-root">
      <LoginScreen />
      <AppShell />
      <Overlays />
    </div>
  );
}
