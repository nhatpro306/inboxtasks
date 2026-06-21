import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, Settings as ISettings, Account } from "../lib/api.js";
import { Segmented } from "../components/Segmented.js";
import { enablePush, disablePush } from "../lib/push.js";
import { fmtDate } from "../lib/format.js";

export function Settings() {
  const [settings, setSettings] = useState<ISettings | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Add account form state
  const [addingAccount, setAddingAccount] = useState(false);
  const [acctEmail, setAcctEmail] = useState("");
  const [acctHost, setAcctHost] = useState("imap.gmail.com");
  const [acctPort, setAcctPort] = useState("993");
  const [acctPassword, setAcctPassword] = useState("");
  const [savingAcct, setSavingAcct] = useState(false);

  // Gemini key
  const [geminiKey, setGeminiKey] = useState("");
  const [savingGemini, setSavingGemini] = useState(false);

  // Scan settings
  const [pollMin, setPollMin] = useState("15");
  const [reminderMin, setReminderMin] = useState("30");
  const [savingPoll, setSavingPoll] = useState(false);

  // Push toggle
  const [togglingPush, setTogglingPush] = useState(false);

  // Calendar sync
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (searchParams.get("calendar") === "connected") {
      showToast("Google Calendar connected successfully!");
    }
    void Promise.all([loadSettings(), loadAccounts()]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  async function loadSettings() {
    try {
      const s = await api.getSettings();
      setSettings(s);
      setPollMin(String(s.poll_interval_minutes));
      setReminderMin(String(s.reminder_lead_minutes));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function loadAccounts() {
    try {
      const data = await api.listAccounts();
      setAccounts(data);
    } catch {
      // ignore
    }
  }

  async function handleAiProvider(val: "auto" | "local" | "gemini") {
    if (!settings) return;
    try {
      const updated = await api.putSettings({ ai_provider_pref: val });
      setSettings(updated);
      showToast("AI provider updated.");
    } catch {
      // ignore
    }
  }

  async function handleSaveGemini(e: React.FormEvent) {
    e.preventDefault();
    if (!geminiKey.trim()) return;
    setSavingGemini(true);
    try {
      const updated = await api.putSettings({ gemini_key_masked: geminiKey } as Partial<ISettings>);
      setSettings(updated);
      setGeminiKey("");
      showToast("Gemini key saved.");
    } catch {
      // ignore
    } finally {
      setSavingGemini(false);
    }
  }

  async function handleSavePoll(e: React.FormEvent) {
    e.preventDefault();
    setSavingPoll(true);
    try {
      const updated = await api.putSettings({
        poll_interval_minutes: Number(pollMin),
        reminder_lead_minutes: Number(reminderMin),
      });
      setSettings(updated);
      showToast("Scan settings saved.");
    } catch {
      // ignore
    } finally {
      setSavingPoll(false);
    }
  }

  async function handlePushToggle() {
    if (!settings) return;
    setTogglingPush(true);
    try {
      if (settings.push_enabled) {
        await disablePush();
        const updated = await api.putSettings({ push_enabled: false });
        setSettings(updated);
        showToast("Notifications disabled.");
      } else {
        const ok = await enablePush();
        if (ok) {
          const updated = await api.putSettings({ push_enabled: true });
          setSettings(updated);
          showToast("Notifications enabled.");
        } else {
          showToast("Permission denied. Enable in browser settings.");
        }
      }
    } catch {
      // ignore
    } finally {
      setTogglingPush(false);
    }
  }

  async function handleCalendarConnect() {
    try {
      const res = await api.calendarConnect();
      window.location.href = res.url;
    } catch {
      // ignore
    }
  }

  async function handleCalendarSync() {
    setSyncing(true);
    try {
      const res = await api.calendarSync();
      showToast(`Synced ${res.synced} event${res.synced !== 1 ? "s" : ""}.`);
    } catch {
      showToast("Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    setSavingAcct(true);
    try {
      const acct = await api.addAccount({
        email_address: acctEmail,
        imap_host: acctHost,
        imap_port: Number(acctPort),
        auth_type: "plain",
        app_password: acctPassword,
      });
      setAccounts((prev) => [...prev, acct]);
      setAcctEmail("");
      setAcctPassword("");
      setAddingAccount(false);
      showToast("Account added.");
    } catch {
      // ignore
    } finally {
      setSavingAcct(false);
    }
  }

  async function handleDeleteAccount(id: string) {
    if (!confirm("Remove this account?")) return;
    try {
      await api.deleteAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      showToast("Account removed.");
    } catch {
      // ignore
    }
  }

  if (loading) {
    return <div className="text-sub text-sm py-10 text-center">Loading…</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold mb-5">Settings</h1>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-text text-white text-sm px-4 py-2.5 rounded-btn shadow-card">
          {toast}
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* 1. AI Provider */}
        <section className="bg-card rounded-card border border-border p-5 shadow-card">
          <h2 className="text-sm font-semibold mb-3">AI Provider</h2>
          <Segmented<"auto" | "local" | "gemini">
            value={settings?.ai_provider_pref ?? "auto"}
            options={[
              { label: "Local", value: "local" },
              { label: "Auto", value: "auto" },
              { label: "Gemini", value: "gemini" },
            ]}
            onChange={handleAiProvider}
          />
          {settings?.ai_provider_pref === "local" && (
            <p className="text-xs text-muted mt-2">
              Using local Ollama model. Make sure Ollama is running at{" "}
              <code className="bg-bg px-1 rounded">{settings.ollama_url}</code>.
            </p>
          )}
        </section>

        {/* 2. Gemini API key */}
        <section className="bg-card rounded-card border border-border p-5 shadow-card">
          <h2 className="text-sm font-semibold mb-3">Gemini API Key</h2>
          <form onSubmit={handleSaveGemini} className="flex gap-2">
            <input
              type="password"
              className="text-sm border border-border rounded-btn px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder={settings?.gemini_key_masked ? `${settings.gemini_key_masked}` : "Enter API key"}
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />
            <button
              type="submit"
              disabled={savingGemini || !geminiKey.trim()}
              className="text-sm bg-accent text-white rounded-btn px-4 py-2 font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {savingGemini ? "Saving…" : "Save"}
            </button>
          </form>
        </section>

        {/* 3. Scan frequency */}
        <section className="bg-card rounded-card border border-border p-5 shadow-card">
          <h2 className="text-sm font-semibold mb-3">Scan Frequency</h2>
          <form onSubmit={handleSavePoll} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-sub mb-1 block">
                  Poll every (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                  value={pollMin}
                  onChange={(e) => setPollMin(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-sub mb-1 block">
                  Reminder lead (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                  value={reminderMin}
                  onChange={(e) => setReminderMin(e.target.value)}
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                disabled={savingPoll}
                className="text-sm bg-accent text-white rounded-btn px-4 py-2 font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {savingPoll ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </section>

        {/* 4. Calendar */}
        <section className="bg-card rounded-card border border-border p-5 shadow-card">
          <h2 className="text-sm font-semibold mb-3">Calendar</h2>
          {settings?.calendar_connected ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-green font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green" />
                Connected
              </span>
              <button
                onClick={handleCalendarSync}
                disabled={syncing}
                className="text-sm bg-accent-tint text-accent rounded-btn px-3 py-1.5 font-medium hover:bg-accent/20 disabled:opacity-50 transition-colors"
              >
                {syncing ? "Syncing…" : "Sync now"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleCalendarConnect}
              className="text-sm bg-accent-tint text-accent rounded-btn px-3 py-1.5 font-medium hover:bg-accent/20 transition-colors"
            >
              Connect Google Calendar
            </button>
          )}
        </section>

        {/* 5. Notifications */}
        <section className="bg-card rounded-card border border-border p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Push Notifications</h2>
              <p className="text-xs text-muted mt-0.5">
                Get notified about upcoming tasks.
              </p>
            </div>
            <button
              onClick={handlePushToggle}
              disabled={togglingPush}
              className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
                settings?.push_enabled ? "bg-accent" : "bg-border"
              }`}
              aria-label="Toggle push notifications"
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  settings?.push_enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </section>

        {/* 6. Email accounts */}
        <section className="bg-card rounded-card border border-border p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Email Accounts</h2>
            <button
              onClick={() => setAddingAccount((v) => !v)}
              className="text-xs bg-accent-tint text-accent rounded-btn px-2.5 py-1.5 font-medium hover:bg-accent/20 transition-colors"
            >
              {addingAccount ? "Cancel" : "+ Add inbox"}
            </button>
          </div>

          {/* Account list */}
          {accounts.length === 0 && !addingAccount && (
            <p className="text-sm text-muted">No accounts connected.</p>
          )}
          <div className="flex flex-col gap-2 mb-3">
            {accounts.map((acct) => (
              <div
                key={acct.id}
                className="flex items-center justify-between border border-border rounded-btn px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-text">{acct.email_address}</p>
                  <p className="text-xs text-muted">
                    {acct.last_synced_at
                      ? `Last synced ${fmtDate(acct.last_synced_at)}`
                      : "Never synced"}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteAccount(acct.id)}
                  className="text-xs text-danger hover:text-danger/80"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Add account form */}
          {addingAccount && (
            <form onSubmit={handleAddAccount} className="flex flex-col gap-2 border-t border-border pt-3">
              <input
                type="email"
                required
                placeholder="Email address"
                className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                value={acctEmail}
                onChange={(e) => setAcctEmail(e.target.value)}
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  className="col-span-2 text-sm border border-border rounded-btn px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="IMAP host"
                  value={acctHost}
                  onChange={(e) => setAcctHost(e.target.value)}
                />
                <input
                  type="number"
                  className="text-sm border border-border rounded-btn px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="Port"
                  value={acctPort}
                  onChange={(e) => setAcctPort(e.target.value)}
                />
              </div>
              <input
                type="password"
                required
                placeholder="App password"
                className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                value={acctPassword}
                onChange={(e) => setAcctPassword(e.target.value)}
              />
              <p className="text-xs text-muted">
                Use a Gmail app password, not your main password.
              </p>
              <button
                type="submit"
                disabled={savingAcct}
                className="text-sm bg-accent text-white rounded-btn px-4 py-2 font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {savingAcct ? "Adding…" : "Add account"}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
