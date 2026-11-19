import { html } from "jsx-async-runtime";

export default function Logo({ size }: { size: number }) {
  return html(/*svg*/ `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" width="${size}" height="${size}" aria-label="JeasxCMS">
  <style>
    .from { stop-color: oklch(55% 0.22 275); }
    .to { stop-color: oklch(60% 0.24 305); }
    .fg { fill: #fff; }
    .stem { stroke: #fff; }
    @media (prefers-color-scheme: dark) {
      .from { stop-color: oklch(68% 0.18 275); }
      .to { stop-color: oklch(70% 0.2 305); }
      .fg { fill: oklch(15% 0.02 275); }
      .stem { stroke: oklch(15% 0.02 275); }
    }
  </style>
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop class="from" offset="0" />
      <stop class="to" offset="1" />
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="7.5" fill="url(#background)" />
  <path class="stem" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M8.75 9.5 4.5 16l4.25 6.5M23.25 9.5 27.5 16l-4.25 6.5" />
  <rect class="fg" x="12" y="8.5" width="8" height="7" rx="1.5" />
  <rect class="fg" x="12" y="17.25" width="8" height="2.75" rx="1.1" opacity="0.8" />
  <rect class="fg" x="12" y="21.25" width="8" height="2.25" rx="1.1" opacity="0.55" />
</svg>`);
}
