import Layout from "@cms/render/admin-layout";

/** File library shell; the UI is rendered in the browser (src/@cms/browser/file-library/file-library.tsx). */
export default function () {
  return (
    <Layout title="Files">
      <main class="admin-main" id="file-library">
        <p>Loading…</p>
      </main>
    </Layout>
  );
}
