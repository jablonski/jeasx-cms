import { cacheBuster } from "@cms/core/cache-buster";

/** Document head of all admin pages, including the login. */
export default function Head({
  title,
  cmsPath,
  script = false,
}: {
  title: string;
  cmsPath: string | undefined;
  /** loads the admin's browser app */
  script?: boolean;
}) {
  return (
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="robots" content="noindex" />
      {cmsPath && <base href={`${cmsPath}/`} />}
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="stylesheet" href={cacheBuster("browser/styles/index.css")} />
      {script && <script type="module" src={cacheBuster("browser/index.js")} />}
      <title>{`${title} | JeasxCMS`}</title>
    </head>
  );
}
