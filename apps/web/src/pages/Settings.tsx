import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, Settings as ISettings, Account } from "../lib/api.js";
import { Segmented } from "../components/Segmented.js";
import { Toast } from "../components/Toast.js";
import { enablePush, disablePush } from "../lib/push.js";
import { fmtDate } from "../lib/format.js";
import {
  KeyIcon,
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  SpinnerIcon,
  RefreshIcon,
  SparklesIcon,
  ShieldIcon,
  GoogleIcon,
  GmailIcon,
  ExternalLinkIcon,
  TrashIcon,
  BrandLogo,
} from "../components/Icons.js";

const DEFAULT_SETTINGS: ISettings = {
  ai_provider_pref: "auto",
  ollama_url: "http://localhost:11434",
  poll_interval_minutes: 60,
  reminder_lead_minutes: 60,
  calendar_provider: null,
  gemini_key_masked: "",
  calendar_connected: false,
  push_enabled: false,
};

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
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [clearingKey, setClearingKey] = useState(false);

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
      setError(null);
    } catch {
      setSettings(DEFAULT_SETTINGS);
      setPollMin(String(DEFAULT_SETTINGS.poll_interval_minutes));
      setReminderMin(String(DEFAULT_SETTINGS.reminder_lead_minutes));
      setError("Unable to reach the API server. Showing offline default settings — check that the API is running.");
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
    } catch (err) {
      showToast("Failed to save settings: " + (err as Error).message);
    }
  }

  async function handleSaveGemini(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const trimmed = geminiKey.trim();
    if (!trimmed) return;
    setSavingGemini(true);
    setTestResult(null);
    try {
      const updated = await api.putSettings({ gemini_key: trimmed });
      setSettings(updated);
      setGeminiKey("");
      showToast("Gemini key saved.");
    } catch (err) {
      showToast("Failed to save settings: " + (err as Error).message);
    } finally {
      setSavingGemini(false);
    }
  }

  async function handleTestGemini() {
    const localKey = typeof localStorage !== "undefined" ? localStorage.getItem("inboxtasks_gemini_key") : null;
    const keyToTest = geminiKey.trim() || localKey || "";
    if (!keyToTest) {
      setTestResult({ ok: false, message: "Please enter a Gemini API key first" });
      return;
    }
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await api.testGeminiKey(keyToTest);
      if (res.ok) {
        setTestResult({ ok: true, message: "Key is valid!" });
      } else {
        setTestResult({
          ok: false,
          message: res.error ? `Invalid key: ${res.error}` : "Invalid key: verification failed",
        });
      }
    } catch (err) {
      setTestResult({
        ok: false,
        message: `Invalid key: ${(err as Error).message}`,
      });
    } finally {
      setTestingKey(false);
    }
  }

  async function handleRemoveGemini() {
    if (!confirm("Remove saved Gemini API key?")) return;
    setClearingKey(true);
    setTestResult(null);
    try {
      const updated = await api.putSettings({ gemini_key: "" });
      setSettings(updated);
      setGeminiKey("");
      showToast("Gemini key removed.");
    } catch (err) {
      showToast("Failed to remove key: " + (err as Error).message);
    } finally {
      setClearingKey(false);
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
    } catch (err) {
      showToast("Failed to save settings: " + (err as Error).message);
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
    } catch (err) {
      showToast("Failed to save settings: " + (err as Error).message);
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

  const localKey = typeof localStorage !== "undefined" ? localStorage.getItem("inboxtasks_gemini_key") : null;
  const isKeyConfigured = Boolean(settings?.gemini_key_masked || localKey);

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="text-sub text-sm py-10 text-center">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2.5 mb-6">
        <BrandLogo className="w-6 h-6 text-accent flex-shrink-0" />
        <h1 className="text-xl font-bold text-text tracking-tight">Settings</h1>
      </div>

      {error && (
        <div role="alert" className="mb-6 p-4 rounded-card bg-amber/10 border border-amber/30 text-text flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="w-5 h-5 text-amber flex-shrink-0" />
            <span className="text-sub font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => { setLoading(true); void Promise.all([loadSettings(), loadAccounts()]); }}
            className="text-xs bg-accent text-white font-medium px-3 py-1.5 rounded-btn hover:bg-accent/90 transition-colors flex-shrink-0 flex items-center gap-1.5"
          >
            <RefreshIcon className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* 1. AI Provider */}
        <section className="bg-card rounded-card border border-border shadow-card p-6" aria-labelledby="ai-provider-heading">
          <div className="flex items-center gap-2 mb-2">
            <SparklesIcon className="w-5 h-5 text-accent flex-shrink-0" />
            <h2 id="ai-provider-heading" className="text-base font-semibold text-text">AI Provider</h2>
          </div>
          <p className="text-xs text-sub mb-4">
            Select which AI provider is used to extract tasks and understand your incoming emails.
          </p>
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
            <p className="text-xs text-muted mt-3">
              Using local Ollama model. Make sure Ollama is running at{" "}
              <code className="bg-bg px-1.5 py-0.5 rounded border border-border text-sub">{settings.ollama_url}</code>.
            </p>
          )}
        </section>

        {/* 2. Gemini API key */}
        <section className="bg-card rounded-card border border-border shadow-card p-6" aria-labelledby="gemini-key-heading">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <KeyIcon className="w-5 h-5 text-accent flex-shrink-0" />
                <h2 id="gemini-key-heading" className="text-base font-semibold text-text">Gemini API Key</h2>
              </div>
              <p className="text-xs text-sub mt-1">
                Configure your Google Gemini API key to enable cloud AI task extraction and intelligent suggestions.
              </p>
            </div>
            {isKeyConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex-shrink-0">
                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                Configured & Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-medium bg-slate-500/10 text-slate-500 border border-slate-500/20 flex-shrink-0">
                Not Configured
              </span>
            )}
          </div>

          <form onSubmit={(e) => void handleSaveGemini(e)} className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <label htmlFor="gemini-key-input" className="sr-only">Gemini API key</label>
                <input
                  id="gemini-key-input"
                  type={showGeminiKey ? "text" : "password"}
                  className="text-sm border border-border rounded-btn pl-3 pr-10 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30 bg-bg transition-colors"
                  placeholder={
                    settings?.gemini_key_masked
                      ? `${settings.gemini_key_masked}`
                      : localKey
                      ? "Stored in browser storage"
                      : "Enter API key"
                  }
                  value={geminiKey}
                  onChange={(e) => {
                    setGeminiKey(e.target.value);
                    if (testResult) setTestResult(null);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey((prev) => !prev)}
                  aria-label={showGeminiKey ? "Hide API key" : "Show API key"}
                  title={showGeminiKey ? "Hide API key" : "Show API key"}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-text transition-colors"
                >
                  {showGeminiKey ? (
                    <EyeOffIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => void handleTestGemini()}
                  disabled={testingKey || (!geminiKey.trim() && !isKeyConfigured)}
                  className="text-sm bg-accent-tint text-accent rounded-btn px-3.5 py-2 font-medium hover:bg-accent/20 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {testingKey ? (
                    <>
                      <SpinnerIcon className="w-4 h-4 text-accent" />
                      <span>Testing…</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-4 h-4" />
                      <span>Test Connection</span>
                    </>
                  )}
                </button>

                <button
                  type="submit"
                  disabled={savingGemini || !geminiKey.trim()}
                  className="text-sm bg-accent text-white rounded-btn px-4 py-2 font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {savingGemini ? (
                    <>
                      <SpinnerIcon className="w-4 h-4 text-white" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <span>Save Key</span>
                  )}
                </button>

                {isKeyConfigured && (
                  <button
                    type="button"
                    onClick={() => void handleRemoveGemini()}
                    disabled={clearingKey}
                    className="text-sm text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 rounded-btn px-3 py-2 font-medium transition-colors flex items-center gap-1.5"
                    aria-label="Remove saved Gemini key"
                  >
                    {clearingKey ? (
                      <>
                        <SpinnerIcon className="w-4 h-4 text-danger" />
                        <span>Removing…</span>
                      </>
                    ) : (
                      <>
                        <TrashIcon className="w-4 h-4 text-danger" />
                        <span>Remove Key</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {testResult && (
              <div
                role="alert"
                className={`p-3 rounded-btn border text-xs flex items-center gap-2 transition-all ${
                  testResult.ok
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
                    : "bg-danger/10 border-danger/30 text-danger"
                }`}
              >
                {testResult.ok ? (
                  <CheckCircleIcon className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircleIcon className="w-4 h-4 flex-shrink-0 text-danger" />
                )}
                <span className="font-medium">{testResult.message}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-muted pt-1">
              <ShieldIcon className="w-3.5 h-3.5 flex-shrink-0 text-sub" />
              <span>
                Need a key?{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline inline-flex items-center gap-1 font-medium"
                >
                  Get a free Gemini API key from Google AI Studio
                  <ExternalLinkIcon className="w-3 h-3" />
                </a>
              </span>
            </div>
          </form>
        </section>

        {/* 3. Scan frequency */}
        <section className="bg-card rounded-card border border-border shadow-card p-6" aria-labelledby="scan-freq-heading">
          <div className="flex items-center gap-2 mb-2">
            <RefreshIcon className="w-5 h-5 text-accent flex-shrink-0" />
            <h2 id="scan-freq-heading" className="text-base font-semibold text-text">Scan Frequency</h2>
          </div>
          <p className="text-xs text-sub mb-4">
            Configure how frequently InboxTasks checks your mailboxes and sends lead-time reminders.
          </p>
          <form onSubmit={(e) => void handleSavePoll(e)} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="poll-interval" className="text-xs font-medium text-sub mb-1.5 block">
                  Poll every (minutes)
                </label>
                <input
                  id="poll-interval"
                  type="number"
                  min="1"
                  className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30 bg-bg transition-colors"
                  value={pollMin}
                  onChange={(e) => setPollMin(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="reminder-lead" className="text-xs font-medium text-sub mb-1.5 block">
                  Reminder lead (minutes)
                </label>
                <input
                  id="reminder-lead"
                  type="number"
                  min="0"
                  className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30 bg-bg transition-colors"
                  value={reminderMin}
                  onChange={(e) => setReminderMin(e.target.value)}
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                disabled={savingPoll}
                className="text-sm bg-accent text-white rounded-btn px-4 py-2 font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {savingPoll ? (
                  <>
                    <SpinnerIcon className="w-4 h-4 text-white" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <span>Save</span>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* 4. Calendar */}
        <section className="bg-card rounded-card border border-border shadow-card p-6" aria-labelledby="calendar-heading">
          <div className="flex items-center gap-2 mb-2">
            <GoogleIcon className="w-5 h-5 flex-shrink-0" />
            <h2 id="calendar-heading" className="text-base font-semibold text-text">Calendar</h2>
          </div>
          <p className="text-xs text-sub mb-4">
            Synchronize tasks and deadlines with Google Calendar.
          </p>
          {settings?.calendar_connected ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-green font-medium flex items-center gap-1.5">
                <CheckCircleIcon className="w-4 h-4 text-green" />
                Connected
              </span>
              <button
                type="button"
                onClick={() => void handleCalendarSync()}
                disabled={syncing}
                aria-label={syncing ? "Syncing calendar…" : "Sync Google Calendar now"}
                className="text-sm bg-accent-tint text-accent rounded-btn px-3 py-1.5 font-medium hover:bg-accent/20 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {syncing ? (
                  <>
                    <SpinnerIcon className="w-3.5 h-3.5 text-accent" />
                    <span>Syncing…</span>
                  </>
                ) : (
                  <>
                    <RefreshIcon className="w-3.5 h-3.5" />
                    <span>Sync now</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void handleCalendarConnect()}
              aria-label="Connect Google Calendar"
              className="text-sm bg-accent-tint text-accent rounded-btn px-4 py-2 font-medium hover:bg-accent/20 transition-colors inline-flex items-center gap-2"
            >
              <GoogleIcon className="w-4 h-4" />
              <span>Connect Google Calendar</span>
            </button>
          )}
        </section>

        {/* 5. Notifications */}
        <section className="bg-card rounded-card border border-border shadow-card p-6" aria-labelledby="notifications-heading">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 id="notifications-heading" className="text-base font-semibold text-text">Push Notifications</h2>
              <p id="notifications-desc" className="text-xs text-sub mt-0.5">
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
              className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 flex-shrink-0 ${
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
        <section className="bg-card rounded-card border border-border shadow-card p-6" aria-labelledby="accounts-heading">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GmailIcon className="w-5 h-5 flex-shrink-0" />
              <h2 id="accounts-heading" className="text-base font-semibold text-text">Email Accounts</h2>
            </div>
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
          <p className="text-xs text-sub mb-4">
            Connect IMAP mailboxes so InboxTasks can scan incoming messages and suggest action items.
          </p>

          {/* Account list */}
          {accounts.length === 0 && !addingAccount && (
            <p className="text-sm text-muted py-1">No accounts connected.</p>
          )}
          <div className="flex flex-col gap-2 mb-3" role="list" aria-label="Connected email accounts">
            {accounts.map((acct) => (
              <div
                key={acct.id}
                role="listitem"
                className="flex items-center justify-between border border-border rounded-btn px-3 py-2 bg-bg/50"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <GmailIcon className="w-4 h-4 flex-shrink-0 text-sub" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text truncate">{acct.email_address}</p>
                    <p className="text-xs text-muted">
                      {acct.last_synced_at
                        ? `Last synced ${fmtDate(acct.last_synced_at)}`
                        : "Never synced"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDeleteAccount(acct.id)}
                  aria-label={`Remove account ${acct.email_address}`}
                  className="text-xs text-danger hover:text-danger/80 inline-flex items-center gap-1 p-1 hover:bg-danger/10 rounded transition-colors"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            ))}
          </div>

          {/* Add account form */}
          {addingAccount && (
            <form
              id="add-account-form"
              onSubmit={(e) => void handleAddAccount(e)}
              className="flex flex-col gap-3 border-t border-border pt-4 mt-2"
              aria-label="Add email account"
            >
              <div>
                <label htmlFor="acct-email" className="sr-only">Email address</label>
                <input
                  id="acct-email"
                  type="email"
                  required
                  placeholder="Email address"
                  className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30 bg-bg transition-colors"
                  value={acctEmail}
                  onChange={(e) => setAcctEmail(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label htmlFor="acct-host" className="sr-only">IMAP host</label>
                  <input
                    id="acct-host"
                    className="w-full text-sm border border-border rounded-btn px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/30 bg-bg transition-colors"
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
                    className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30 bg-bg transition-colors"
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
                  className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30 bg-bg transition-colors"
                  value={acctPassword}
                  onChange={(e) => setAcctPassword(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted">
                Use a Gmail app password, not your main password.
              </p>
              <div>
                <button
                  type="submit"
                  disabled={savingAcct}
                  className="text-sm bg-accent text-white rounded-btn px-4 py-2 font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {savingAcct ? (
                    <>
                      <SpinnerIcon className="w-4 h-4 text-white" />
                      <span>Adding…</span>
                    </>
                  ) : (
                    <span>Add account</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
