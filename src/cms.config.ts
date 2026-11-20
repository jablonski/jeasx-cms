/**
 * Configuration of this site, handed to the CMS in src/[...guard].ts.
 * All options: SiteConfig in src/@cms/core/site.ts.
 *
 * Add a block: create it in ./blocks, list it in `blocks` (the page type "page" allows
 * all of them) and style it in ./styles/blocks.css. Blocks run on the server only (the
 * editor canvas is rendered there, too), so they may use server-side code.
 */
import type { SiteConfig } from "@cms/core/site";
import Accordion from "./blocks/Accordion";
import Articles from "./blocks/Articles";
import CallToAction from "./blocks/CallToAction";
import Columns from "./blocks/Columns";
import Download from "./blocks/Download";
import Features from "./blocks/Features";
import Gallery from "./blocks/Gallery";
import Hero from "./blocks/Hero";
import Image from "./blocks/Image";
import Logos from "./blocks/Logos";
import Notice from "./blocks/Notice";
import Pricing from "./blocks/Pricing";
import Quote from "./blocks/Quote";
import Section from "./blocks/Section";
import Stats from "./blocks/Stats";
import Table from "./blocks/Table";
import Team from "./blocks/Team";
import Text from "./blocks/Text";
import Timeline from "./blocks/Timeline";

// Order = order in the block picker.
const BLOCKS = [
  Hero,
  Text,
  Image,
  Gallery,
  Features,
  Stats,
  Quote,
  CallToAction,
  Notice,
  Accordion,
  Download,
  Table,
  Pricing,
  Team,
  Timeline,
  Logos,
  Articles,
  Columns,
  Section,
];

export default {
  files: "/files",
  stylesheets: ["/styles/index.css"],
  blocks: BLOCKS,
  blockClass: (block) => `block block--${block.type}`,
  pages: {
    page: {
      label: "Page",
      fields: {
        description: { type: "textarea", label: "Meta description" },
        inNav: { type: "boolean", label: "Show in navigation" },
        navOrder: { type: "number", label: "Navigation order" },
        inFooter: { type: "boolean", label: "Show in footer" },
      },
      blocks: BLOCKS.map((block) => block.type),
      initialBlocks: [Hero.type, Text.type],
    },
    article: {
      label: "Article",
      fields: {
        description: { type: "textarea", label: "Teaser", required: true },
        inNav: { type: "boolean", label: "Show in navigation" },
        navOrder: { type: "number", label: "Navigation order" },
        image: { type: "image", label: "Teaser image" },
        author: { type: "text", label: "Author" },
        date: { type: "date", label: "Date" },
      },
      blocks: [Text, Image, Gallery, Quote, Notice, Accordion, Download, Table].map(
        (block) => block.type,
      ),
      initialBlocks: [Text.type],
    },
  },
} satisfies SiteConfig;
