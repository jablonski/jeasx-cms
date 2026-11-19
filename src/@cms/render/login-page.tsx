import Head from "@cms/render/admin-head";
import Logo from "@cms/render/admin-logo";
import { html } from "jsx-async-runtime";

/** The sign-in form of the admin. */
export default function LoginPage({
  cmsPath,
  next,
  username = "",
  error,
}: {
  cmsPath: string;
  next: string;
  username?: string;
  error?: string;
}) {
  return (
    <>
      {html("<!DOCTYPE html>")}
      <html lang="en">
        <Head title="Sign in" cmsPath={cmsPath} />
        <body class="admin login-page">
          <main class="login-card">
            <Logo size={48} />
            <h1>Sign in to JeasxCMS</h1>
            {error && (
              <p class="errors" role="alert">
                {error}
              </p>
            )}
            <form method="post" action="login">
              <input type="hidden" name="next" value={next} />
              <label for="login-username">Username</label>
              <input
                id="login-username"
                name="username"
                value={username}
                autocomplete="username"
                autocapitalize="none"
                spellcheck="false"
                required
                autofocus={!username}
              />
              <label for="login-password">Password</label>
              <input
                id="login-password"
                name="password"
                type="password"
                autocomplete="current-password"
                required
                autofocus={!!username}
              />
              <button type="submit" class="primary">
                Sign in
              </button>
            </form>
          </main>
        </body>
      </html>
    </>
  );
}
