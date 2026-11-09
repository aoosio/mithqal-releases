// Display conventions shared by the server, browser and news renderer.
export const digits = value => String(value).replace(/[٠-٩۰-۹]/g, c => String(c.charCodeAt(0) - (c <= '٩' ? 0x660 : 0x6f0))).replace(/٫/g, '.').replace(/٬/g, ',');
export const icon = name => `<svg class="ui-icon" aria-hidden="true" focusable="false"><use href="/assets/remix-icons.svg#ri-${name}"></use></svg>`;
const symbols = {'↗':'arrow-right-up-line','↙':'arrow-left-down-line','←':'arrow-left-line','→':'arrow-right-line','↑':'arrow-up-line','↓':'arrow-down-line','＋':'add-line','−':'subtract-line','✓':'check-line'};
export function presentMarkup(html) {
  return html.replace(/<(p|span)\b[^>]*class="[^"]*\beyebrow\b[^"]*"[^>]*>[\s\S]*?<\/\1>/g, '').split(/(<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<[^>]+>)/gi).map(part => part.startsWith('<') ? part : digits(part).replace(/[↗↙←→↑↓＋−✓]/g, c => icon(symbols[c]))).join('');
}
