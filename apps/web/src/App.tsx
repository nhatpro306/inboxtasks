import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/AppShell.js";
import { Today } from "./pages/Today.js";
import { AllTasks } from "./pages/AllTasks.js";
import { Review } from "./pages/Review.js";
import { CalendarPage } from "./pages/CalendarPage.js";
import { Settings } from "./pages/Settings.js";
import { Chat } from "./pages/Chat.js";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Today />} />
        <Route path="today" element={<Today />} />
        <Route path="all" element={<AllTasks />} />
        <Route path="review" element={<Review />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="settings" element={<Settings />} />
        <Route path="chat" element={<Chat />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
