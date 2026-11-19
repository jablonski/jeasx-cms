import { jsxToString } from "jsx-async-runtime";

/** Renders JSX to HTML in the browser, where components are never async. */
export const toHtml = (jsx: unknown) => jsxToString(jsx as JSX.Element) as string;
