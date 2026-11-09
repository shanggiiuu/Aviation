import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { LegacyFrame } from "./components/LegacyFrame";
import { LoginPage, RegisterPage } from "./pages/Auth";
import { ProfilePage } from "./pages/Profile";
import { LivePage } from "./pages/Live";
import { STATIC } from "./config";

// Ported pages are React; every other path shows the matching page of the classic site.
// In the static build the React pages need the API, so /profile falls through to the classic site's on-device profiles.
export function App() {
  return (
    <Routes>
      {!STATIC && <Route element={<Layout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/live" element={<LivePage />} />
      </Route>}
      <Route element={<Layout legacy />}>
        <Route path="*" element={<LegacyFrame />} />
      </Route>
    </Routes>
  );
}
