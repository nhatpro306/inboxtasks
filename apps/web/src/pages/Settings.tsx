import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, Settings as ISettings, Account } from "../lib/api.js";
import { Segmented } from "../components/Segmented.js";
import { Toast } from "../components/Toast.js";
import { enablePush, disablePush } from "../lib/push.js";
import { fmtDate } from "../lib/format.js";

export function Settings() {
  const [settings, setSettings] = useState<ISettings | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  function showToast(msg: string) {
    setToast(msg);
  }

  useEffect(() => {
    if (searchParams.get("calendar") === "connected") {
      showToast("Google Calendar connected successfully!");
    }
    void Promise.all([loadSettings(), loadAccounts()]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSettings() {
    try {
      const s = await api.getSettings();
      setSettings(s);
      setPollMin(String(s.poll_interval_minutes));
      setReminderMin(String(s.reminder_lead_minutes));
    } catch {
      setError("Failed to load settings. Check that the API is running.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAccounts() {
    try {
      const data = await api.listAccounts();
      setAccounts(data);
    } catch {
      // ignore — account list failure is non-critical
    }
  }

  async function handleAiProvider(val: "auto" | "local" | "gemini") {
    if (!settings) return;
    try {
      const updated = await api.putSettings({ ai_provider_pref: val });
      setSettings(updated);
      showToast("AI provider updated.");
    } catch {
      showToast("Failed to update AI provider.");
    }
  }

  async function handleSaveGemini(e: React.FormEvent) {
    e.preventDefault();
    if (!geminiKey.trim()) return;
    setSavingGemini(true);
    try {
      const updated = await api.putSettings({ gemini_key: geminiKey });
      setSettings(updated);
      setGeminiKey("");
      showToast("Gemini key saved.");
    } catch {
      showToast("Failed to save Gemini key.");
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
      showToast("Failed to save scan settings.");
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
      showToast("Failed to toggle notifications.");
    } finally {
      setTogglingPush(false);
    }
  }

  async function handleCalendarConnect() {
    try {
      const res = await api.calendarConnect();
      window.location.href = res.url;
    } catch {
      showToast("Failed to initiate calendar connection.");
    }
  }

  async function handleCalendarSync() {
    setSyncing(true);
    try {
      const res = await api.calendarSync();
      showToast(`Synced ${res.synced} event${res.synced !== 1 ? "s" : ""}.`);
    } catch {
      showToast("Sync failed. Please try again.");
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
      showToast("Failed to add account. Check your credentials.");
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
      showToast("Failed to remove account.");
    }
  }

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="text-sub text-sm py-10 text-center">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <p className="text-danger text-sm font-medium">{error}</p>
        <button
          type="button"
          onClick={() => { setError(null); setLoading(true); void Promise.all([loadSettings(), loadAccounts()]); }}
          className="text-sm bg-accent text-white rounded-btn px-4 py-2 font-medium hover:bg-accent/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold mb-5">Settings</h1>

      <div className="flex flex-col gap-6">
        {/* 1. AI Provider */}
        <section className="bg-card rounded-card border border-border p-5 shadow-card" aria-labelledby="ai-provider-heading">
          <h2 id="ai-provider-heading" className="text-sm font-semibold mb-3">AI Provider</h2>
          <Segmented<"auto" | "local" | "gemini">
            label="AI provider"
            value={settings?.ai_provider_pref ?? "auto"}
            options={[
              { label: "Local", value: "local" },
              { label: "Auto", value: "auto" },
              { label: "Gemini", value: "gemini" },
            ]}
            onChange={(val) => void handleAiProvider(val)}
          />
          {settings?.ai_provider_pref === "local" && (
            <p className="text-xs text-muted mt-2">
              Using local Ollama model. Make sure Ollama is running at{" "}
              <code className="bg-bg px-1 rounded">{settings.ollama_url}</code>.
            </p>
          )}
        </section>

        {/* 2. Gemini API key */}
        <section className="bg-card rounded-card border border-border p-5 shadow-card" aria-labelledby="gemini-key-heading">
          <h2 id="gemini-key-heading" className="text-sm font-semibold mb-3">Gemini API Key</h2>
          <form onSubmit={(e) => void handleSaveGemini(e)} className="flex gap-2">
            <label htmlFor="gemini-key-input" className="sr-only">Gemini API key</label>
            <input
              id="gemini-key-input"
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
        <section className="bg-card rounded-card border border-border p-5 shadow-card" aria-labelledby="scan-freq-heading">
          <h2 id="scan-freq-heading" className="text-sm font-semibold mb-3">Scan Frequency</h2>
          <form onSubmit={(e) => void handleSavePoll(e)} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="poll-interval" className="text-xs font-medium text-sub mb-1 block">
                  Poll every (minutes)
                </label>
                <input
                  id="poll-interval"
                  type="number"
                  min="1"
                  className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                  value={pollMin}
                  onChange={(e) => setPollMin(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="reminder-lead" className="text-xs font-medium text-sub mb-1 block">
                  Reminder lead (minutes)
                </label>
                <input
                  id="reminder-lead"
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
        <section className="bg-card rounded-card border border-border p-5 shadow-card" aria-labelledby="calendar-heading">
          <h2 id="calendar-heading" className="text-sm font-semibold mb-3">Calendar</h2>
          {settings?.calendar_connected ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-green font-medium flex items-center gap-1.5">
                <span aria-hidden="true" className="w-2 h-2 rounded-full bg-green" />
                Connected
              </span>
              <button
                type="button"
                onClick={() => void handleCalendarSync()}
                disabled={syncing}
                aria-label={syncing ? "Syncing calendar…" : "Sync Google Calendar now"}
                className="text-sm bg-accent-tint text-accent rounded-btn px-3 py-1.5 font-medium hover:bg-accent/20 disabled:opacity-50 transition-colors"
              >
                {syncing ? "Syncing…" : "Sync now"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void handleCalendarConnect()}
              aria-label="Connect Google Calendar"
              className="text-sm bg-accent-tint text-accent rounded-btn px-3 py-1.5 font-medium hover:bg-accent/20 transition-colors"
            >
              Connect Google Calendar
            </button>
          )}
        </section>

        {/* 5. Notifications */}
        <section className="bg-card rounded-card border border-border p-5 shadow-card" aria-labelledby="notifications-heading">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="notifications-heading" className="text-sm font-semibold">Push Notifications</h2>
              <p id="notifications-desc" className="text-xs text-muted mt-0.5">
                Get notified about upcoming tasks.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings?.push_enabled ?? false}
              aria-label="Enable push notifications"
              aria-describedby="notifications-desc"
              onClick={() => void handlePushToggle()}
              disabled={togglingPush}
              className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
                settings?.push_enabled ? "bg-accent" : "bg-border"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  settings?.push_enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </section>

        {/* 6. Email accounts */}
        <section className="bg-card rounded-card border border-border p-5 shadow-card" aria-labelledby="accounts-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="accounts-heading" className="text-sm font-semibold">Email Accounts</h2>
            <button
              type="button"
              onClick={() => setAddingAccount((v) => !v)}
              aria-expanded={addingAccount}
              aria-controls="add-account-form"
              className="text-xs bg-accent-tint text-accent rounded-btn px-2.5 py-1.5 font-medium hover:bg-accent/20 transition-colors"
            >
              {addingAccount ? "Cancel" : "+ Add inbox"}
            </button>
          </div>

          {/* Account list */}
          {accounts.length === 0 && !addingAccount && (
            <p className="text-sm text-muted">No accounts connected.</p>
          )}
          <div className="flex flex-col gap-2 mb-3" role="list" aria-label="Connected email accounts">
            {accounts.map((acct) => (
              <div
                key={acct.id}
                role="listitem"
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
                  type="button"
                  onClick={() => void handleDeleteAccount(acct.id)}
                  aria-label={`Remove account ${acct.email_address}`}
                  className="text-xs text-danger hover:text-danger/80"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Add account form */}
          {addingAccount && (
            <form
              id="add-account-form"
              onSubmit={(e) => void handleAddAccount(e)}
              className="flex flex-col gap-2 border-t border-border pt-3"
              aria-label="Add email account"
            >
              <div>
                <label htmlFor="acct-email" className="sr-only">Email address</label>
                <input
                  id="acct-email"
                  type="email"
                  required
                  placeholder="Email address"
                  className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                  value={acctEmail}
                  onChange={(e) => setAcctEmail(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label htmlFor="acct-host" className="sr-only">IMAP host</label>
                  <input
                    id="acct-host"
                    className="w-full text-sm border border-border rounded-btn px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder="IMAP host"
                    value={acctHost}
                    onChange={(e) => setAcctHost(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="acct-port" className="sr-only">IMAP port</label>
                  <input
                    id="acct-port"
                    type="number"
                    className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder="Port"
                    value={acctPort}
                    onChange={(e) => setAcctPort(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="acct-password" className="sr-only">App password</label>
                <input
                  id="acct-password"
                  type="password"
                  required
                  placeholder="App password"
                  className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                  value={acctPassword}
                  onChange={(e) => setAcctPassword(e.target.value)}
                />
              </div>
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

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
