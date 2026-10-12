// src/lib/sanitize-html.ts
/**
 * Lightweight, zero-dependency HTML sanitizer for rich text rendering.
 * Strips active scripts, dangerous tags, inline event handlers, and javascript: links.
 * Works uniformly across both SSR and browser environments.
 */

const BLOCKED_TAGS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "select",
  "textarea",
  "svg",
  "math",
  "base",
  "meta",
  "link",
  "applet",
  "frame",
  "frameset",
  "template",
];

const ALLOWED_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "p",
  "br",
  "hr",
  "ul",
  "ol",
  "li",
  "div",
  "span",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
  "code",
  "sub",
  "sup",
  "a",
]);

export function sanitizeHtml(dirtyHtml: string | null | undefined): string {
  if (!dirtyHtml || typeof dirtyHtml !== "string") {
    return "";
  }

  let sanitized = dirtyHtml;

  // 1. Strip HTML comments
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, "");

  // 2. Strip blocked tag blocks entirely (including contents)
  for (const tag of BLOCKED_TAGS) {
    const blockRegex = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    sanitized = sanitized.replace(blockRegex, "");
    // Self-closing or unpaired blocked tags
    const singleRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi");
    sanitized = sanitized.replace(singleRegex, "");
  }

  // 3. Strip all inline event handlers (e.g. onerror=, onclick=, onload=, etc.)
  sanitized = sanitized.replace(/\s+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // 4. Strip javascript: and vbscript: or data: URIs in any attribute
  sanitized = sanitized.replace(
    /\s+(?:href|src|action|data)\s*=\s*['"]\s*(?:javascript|vbscript|data):[^'"]*['"]/gi,
    "",
  );

  // 5. Filter tags: allow only ALLOWED_TAGS
  sanitized = sanitized.replace(/<\/?([a-zA-Z0-9_-]+)\b([^>]*)>/gi, (match, tagName: string, attrs: string) => {
    const lower = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(lower)) {
      // Disallow tag: strip tag markup
      return "";
    }

    // Is it a closing tag?
    if (match.startsWith("</")) {
      return `</${lower}>`;
    }

    // For allowed opening tags, only permit safe class/className, target, and safe href for <a>
    let cleanAttrs = "";
    if (lower === "a") {
      const hrefMatch = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      if (hrefMatch) {
        const url = (hrefMatch[1] || hrefMatch[2] || hrefMatch[3] || "").trim();
        if (/^(https?:|\/|mailto:)/i.test(url)) {
          cleanAttrs += ` href="${url.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer"`;
        }
      }
    }

    const classMatch = attrs.match(/\b(?:class|className)\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (classMatch) {
      const cls = (classMatch[1] || classMatch[2] || "").trim();
      if (cls && !/[<>]/.test(cls)) {
        cleanAttrs += ` class="${cls.replace(/"/g, "&quot;")}"`;
      }
    }

    const isSelfClosing = match.endsWith("/>") || lower === "br" || lower === "hr";
    return `<${lower}${cleanAttrs}${isSelfClosing ? " /" : ""}>`;
  });

  return sanitized;
}
