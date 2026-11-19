import { getPublishedPage } from "@cms/content/pages";
import type { RouteProps } from "@cms/core/types";
import RenderBlocks from "@cms/render/render-blocks";
import Layout from "./Layout";

export default function ({ request }: RouteProps) {
  const page = getPublishedPage(request.path);
  if (!page) {
    return;
  }

  return (
    <Layout title={page.title} description={String(page.meta.description ?? "")}>
      <RenderBlocks blocks={page.blocks} />
    </Layout>
  );
}
