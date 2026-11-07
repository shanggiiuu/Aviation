import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { LegacyFrame } from "./components/LegacyFrame";
import { LoginPage, RegisterPage } from "./pages/Auth";
import { ProfilePage } from "./pages/Profile";
import { CommunityPage } from "./pages/Community";
import { ThreadPage } from "./pages/Thread";
import { LivePage } from "./pages/Live";

// Ported pages are React; every other path shows the matching page of the classic site.
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/community/:id" element={<ThreadPage />} />
        <Route path="/live" element={<LivePage />} />
      </Route>
      <Route element={<Layout legacy />}>
        <Route path="*" element={<LegacyFrame />} />
      </Route>
    </Routes>
  );
}
