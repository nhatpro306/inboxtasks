// Pure sanitizer for untrusted email bodies. No node-only deps so it stays testable + browser-safe.
const ZERO_WIDTH = /[​-‍﻿⁠­]/g;
const MAX_LEN = 4000;

export interface RawEmailBody {
  text?: string | null;
  html?: string | null;
}

export function sanitizeEmailBody(body: RawEmailBody): string {
  let s = body.text && body.text.trim().length > 0 ? body.text : body.html ? htmlToText(body.html) : "";
  s = stripQuotedReplies(s);
  s = stripSignature(s);
  s = s.replace(ZERO_WIDTH, "");
  s = s.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (s.length > MAX_LEN) s = s.slice(0, MAX_LEN);
  return s;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"');
}

function stripQuotedReplies(s: string): string {
  const lines = s.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^>/.test(t)) continue;
    if (/^On .+ wrote:$/.test(t)) break;
    if (/^-{2,}\s*Original Message\s*-{2,}/i.test(t)) break;
    if (/^_{5,}$/.test(t)) break;
    if (/^From:\s/.test(t) && out.length > 0) break;
    out.push(line);
  }
  return out.join("\n");
}

function stripSignature(s: string): string {
  const idx = s.indexOf("\n-- \n");
  return idx >= 0 ? s.slice(0, idx) : s;
}
