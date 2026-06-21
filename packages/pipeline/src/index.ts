export { ingestAccount, ingestAllAccounts } from "./ingest.js";
export { processUnprocessedEmails } from "./extract.js";
export { sendDueReminders } from "./reminders.js";

import { ingestAllAccounts } from "./ingest.js";
import { processUnprocessedEmails } from "./extract.js";
import { sendDueReminders } from "./reminders.js";

export async function runCycle(): Promise<void> {
  await ingestAllAccounts();
  await processUnprocessedEmails();
  await sendDueReminders();
}
