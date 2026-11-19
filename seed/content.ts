/** The demo website's pages. */
import { newId } from "@cms/shared/block-data";
import { BLOCKS } from "@cms/shared/blocks";
import { defaults } from "@cms/shared/fields";
import type { SeedAssets } from "./assets";

/** Block with defaults for all fields not given. */
function block(type: string, data: Record<string, unknown> = {}) {
  return {
    id: newId(),
    type,
    data: { ...defaults(BLOCKS[type].fields), ...data },
  };
}

const text = (heading: string, body: string) =>
  block("text", { heading, text: body });

export function pages({ img, people, logos, docs }: SeedAssets) {
  const nav = (navOrder: number, description: string) => ({
    description,
    inNav: true,
    navOrder,
    inFooter: false,
  });
  const legal = (description: string) => ({
    description,
    inNav: false,
    navOrder: 0,
    inFooter: true,
  });
  const article = (
    description: string,
    author: string,
    date: string,
    image: string,
  ) => ({
    description,
    author,
    date,
    image,
    inNav: false,
    navOrder: 0,
  });
  const feature = (icon: string, title: string, body: string, url = "") => ({
    icon,
    title,
    text: body,
    url,
  });
  const customerLogos = block("logos", {
    heading: "Trusted by teams who publish every day",
    logos: [
      { src: logos.northwind, alt: "Northwind", url: "" },
      { src: logos.fieldnote, alt: "Fieldnote", url: "" },
      { src: logos.harbor, alt: "Harbor & Co", url: "" },
      { src: logos.lumen, alt: "Lumen Labs", url: "" },
      { src: logos.orbit, alt: "Orbit Works", url: "" },
    ],
  });

  return [
    // ------------------------------------------------------------------------ home
    {
      type: "page",
      slug: "/",
      title: "Home",
      meta: nav(
        0,
        "Jeasx CMS: build fast websites from blocks, edited right on the page.",
      ),
      blocks: [
        block("hero", {
          heading: "Build pages from blocks",
          text: "A small, fast CMS built with **Jeasx**, JSX and SQLite. Edit right on the page and publish in seconds.",
          ctaLabel: "See the product",
          ctaUrl: "/product",
          align: "center",
        }),
        customerLogos,
        block("features", {
          heading: "Everything you need, nothing you don't",
          columns: "3",
          items: [
            feature(
              "🧱",
              "Composable blocks",
              "Combine 19 ready-made blocks and nest them in sections and columns.",
              "/product",
            ),
            feature(
              "✍️",
              "Edit on the page",
              "Click any text to change it. Other fields open beside a live preview.",
              "/product",
            ),
            feature(
              "⚡",
              "Fast by default",
              "Server-rendered HTML, no client framework and a single SQLite file.",
              "/product",
            ),
          ],
        }),
        block("section", {
          heading: "Small by design",
          background: "soft",
          blocks: [
            block("stats", {
              items: [
                { value: "19", label: "content blocks included" },
                { value: "1", label: "SQLite file holds your content" },
                { value: "0", label: "client frameworks on public pages" },
                { value: "∞", label: "file types in the library" },
              ],
            }),
          ],
        }),
        block("columns", {
          ratio: "wide-left",
          align: "center",
          columns: [
            {
              blocks: [
                text(
                  "Designed for casual editors",
                  "Hover a block to see its toolbar, drag it by the handle to move it, or click **＋** to add something new.\n\nDevelopers define blocks and page types in plain JSX, so the editor always matches the site.",
                ),
              ],
            },
            {
              blocks: [
                block("image", {
                  src: img.studio,
                  alt: "Abstract violet gradient",
                }),
              ],
            },
          ],
        }),
        block("quote", {
          quote:
            "We replaced our old CMS in an afternoon. Editors love that they see exactly what they publish.",
          author: "Alex Rivera",
          role: "Head of Content, Northwind",
        }),
        block("articles", { heading: "From the blog", limit: 3 }),
        block("cta", {
          heading: "Ready to build your site?",
          text: "Open the admin, pick a page and start editing. Changes go live when you publish.",
          buttons: [
            { label: "Open the admin", url: "/@cms", primary: true },
            { label: "Compare plans", url: "/pricing", primary: false },
          ],
        }),
      ],
    },

    // ------------------------------------------------------------------------ product
    {
      type: "page",
      slug: "/product",
      title: "Product",
      meta: nav(
        1,
        "How Jeasx CMS works: visual editing, flexible blocks and a file library.",
      ),
      blocks: [
        block("hero", {
          heading: "One editor for every page",
          text: "From a landing page to a complete website: your team works on the real page, not on a form.",
          image: img.ocean,
          ctaLabel: "View pricing",
          ctaUrl: "/pricing",
          align: "left",
        }),
        block("features", {
          heading: "What's inside",
          columns: "4",
          items: [
            feature(
              "🖱️",
              "Visual editing",
              "Type on the page, drag blocks and see every change immediately.",
            ),
            feature(
              "🗂️",
              "File library",
              "Organize images, PDFs and any other file in folders.",
            ),
            feature(
              "↺",
              "Page history",
              "Compare earlier versions and restore them at any time.",
            ),
            feature(
              "🧩",
              "Custom blocks",
              "Add a block with one JSX file and a list of fields.",
            ),
          ],
        }),
        block("section", {
          heading: "From idea to published page",
          background: "accent",
          blocks: [
            block("columns", {
              ratio: "wide-right",
              align: "center",
              columns: [
                {
                  blocks: [
                    block("image", {
                      src: img.forest,
                      alt: "Green abstract gradient",
                    }),
                  ],
                },
                {
                  blocks: [
                    block("timeline", {
                      items: [
                        {
                          date: "Step 1",
                          title: "Compose",
                          text: "Pick blocks and arrange them on the page.",
                        },
                        {
                          date: "Step 2",
                          title: "Refine",
                          text: "Edit text in place and choose files from the library.",
                        },
                        {
                          date: "Step 3",
                          title: "Publish",
                          text: "Save a draft or go live with one click.",
                        },
                      ],
                    }),
                  ],
                },
              ],
            }),
          ],
        }),
        block("gallery", {
          heading: "Made for visual content",
          columns: "3",
          images: [
            {
              src: img.aurora,
              alt: "Blue and turquoise gradient",
              caption: "Full-width heroes",
            },
            {
              src: img.sunset,
              alt: "Orange gradient",
              caption: "Image galleries",
            },
            { src: img.team, alt: "Red gradient", caption: "Rich articles" },
          ],
        }),
        block("table", {
          heading: "Technical overview",
          rows: "Area | Technology | Notes\nServer | Jeasx and Fastify | Server-side JSX\nStorage | SQLite | One database file\nFiles | Local file system | Content-addressed URLs\nLanguage | TypeScript | Core and site",
          caption: "Runs on Node.js 24 or newer.",
        }),
        block("cta", {
          heading: "See it for yourself",
          text: "Download the product sheet or get in touch with us.",
          buttons: [
            {
              label: "Get the product sheet",
              url: "/resources",
              primary: true,
            },
            { label: "Contact us", url: "/contact", primary: false },
          ],
        }),
      ],
    },

    // ------------------------------------------------------------------------ pricing
    {
      type: "page",
      slug: "/pricing",
      title: "Pricing",
      meta: nav(2, "Simple plans for websites of every size."),
      blocks: [
        block("hero", {
          heading: "Simple, honest pricing",
          text: "Start for free and upgrade when your team grows.",
          align: "center",
        }),
        block("notice", {
          kind: "info",
          title: "Demo content",
          text: "These plans are sample data that show the Pricing block.",
        }),
        block("pricing", {
          plans: [
            {
              name: "Starter",
              price: "€0",
              period: "per month",
              description: "For personal sites and experiments.",
              features: "1 website\nAll content blocks\nCommunity support",
              buttonLabel: "Get started",
              buttonUrl: "/contact",
              highlighted: false,
            },
            {
              name: "Team",
              price: "€29",
              period: "per month",
              description: "For teams who publish regularly.",
              features:
                "5 websites\nAll content blocks\nPage history\nEmail support",
              buttonLabel: "Choose Team",
              buttonUrl: "/contact",
              highlighted: true,
            },
            {
              name: "Business",
              price: "€99",
              period: "per month",
              description: "For organizations with custom needs.",
              features:
                "Unlimited websites\nCustom blocks\nTraining for editors\nPriority support",
              buttonLabel: "Talk to us",
              buttonUrl: "/contact",
              highlighted: false,
            },
          ],
        }),
        block("table", {
          heading: "Compare plans",
          rows: "Feature | Starter | Team | Business\nWebsites | 1 | 5 | Unlimited\nContent blocks | All | All | All + custom\nPage history | – | Yes | Yes\nSupport | Community | Email | Priority",
        }),
        block("accordion", {
          heading: "Pricing questions",
          items: [
            {
              question: "Can I change my plan later?",
              answer: "Yes. You can upgrade or downgrade at any time.",
            },
            {
              question: "Is there a contract?",
              answer:
                "No. All plans are billed monthly and can be canceled at any time.",
            },
            {
              question: "Do you offer discounts for non-profits?",
              answer:
                "Yes. Non-profits and schools get the Team plan at half price.",
            },
            {
              question: "Which payment methods do you accept?",
              answer:
                "Credit card, SEPA direct debit and, for the Business plan, invoice.",
            },
          ],
        }),
        block("section", {
          background: "dark",
          blocks: [
            block("quote", {
              quote:
                "The Team plan paid for itself in the first month: no more agency fees for small text changes.",
              author: "Alex Rivera",
              role: "Head of Content, Northwind",
            }),
          ],
        }),
        block("cta", {
          heading: "Not sure which plan fits?",
          text: "Tell us about your website and we'll recommend a plan, no strings attached.",
          buttons: [
            { label: "Talk to us", url: "/contact", primary: true },
            { label: "Read the FAQ", url: "/faq", primary: false },
          ],
        }),
      ],
    },

    // ------------------------------------------------------------------------ about
    {
      type: "page",
      slug: "/about",
      title: "About",
      meta: nav(3, "The people behind Jeasx CMS and what we believe in."),
      blocks: [
        block("hero", {
          heading: "Small team, big ideas",
          text: "We build tools that stay out of your way.",
          image: img.aurora,
          align: "left",
        }),
        text(
          "Our story",
          "Jeasx CMS started as an experiment: how simple can a CMS be when it is built on a modern JSX server framework?\n\nThe answer turned out to be: **very**. No build pipeline for content, no client-side framework, just blocks rendered on the server.",
        ),
        block("section", {
          heading: "What we value",
          background: "soft",
          blocks: [
            block("columns", {
              ratio: "equal",
              align: "start",
              columns: [
                {
                  blocks: [
                    text(
                      "Simplicity",
                      "Fewer moving parts mean fewer things that break.",
                    ),
                  ],
                },
                {
                  blocks: [
                    text(
                      "Craft",
                      "Details matter: typography, spacing and fast pages.",
                    ),
                  ],
                },
                {
                  blocks: [
                    text(
                      "Openness",
                      "Everything is plain code you can read and change.",
                    ),
                  ],
                },
              ],
            }),
          ],
        }),
        block("timeline", {
          heading: "Our journey",
          items: [
            {
              date: "2024",
              title: "The first prototype",
              text: "A weekend project proves that blocks and JSX fit together.",
            },
            {
              date: "2025",
              title: "The visual editor",
              text: "Editors start working directly on the page.",
            },
            {
              date: "2026",
              title: "A complete CMS",
              text: "File library, page history and a growing set of blocks.",
            },
          ],
        }),
        block("team", {
          heading: "Meet the team",
          members: [
            {
              photo: people.sam,
              name: "Sam Lee",
              role: "Product",
              bio: "Keeps the editor simple.",
            },
            {
              photo: people.jordan,
              name: "Jordan Kim",
              role: "Design",
              bio: "Cares about every pixel.",
            },
            {
              photo: people.maya,
              name: "Maya Okafor",
              role: "Engineering",
              bio: "Makes pages load instantly.",
            },
            {
              photo: people.leo,
              name: "Leo Martin",
              role: "Customer Success",
              bio: "Helps editors get started.",
            },
          ],
        }),
        block("image", {
          src: img.team,
          alt: "Warm abstract gradient",
          caption: "Our office, as imagined by a gradient.",
          wide: true,
        }),
      ],
    },

    // ------------------------------------------------------------------------ resources
    {
      type: "page",
      slug: "/resources",
      title: "Resources",
      meta: nav(4, "Guides, data sheets and press material to download."),
      blocks: [
        block("hero", {
          heading: "Resources",
          text: "Everything you need to evaluate and introduce Jeasx CMS.",
          align: "left",
        }),
        block("download", {
          heading: "Documents",
          items: [
            {
              title: "Getting started guide",
              description: "First steps for editors",
              file: docs.guide,
            },
            {
              title: "Product sheet",
              description: "All features at a glance",
              file: docs.sheet,
            },
          ],
        }),
        block("download", {
          heading: "Data and media",
          items: [
            {
              title: "Block overview",
              description: "All blocks as a spreadsheet",
              file: docs.blocks,
            },
            {
              title: "Press kit",
              description: "Logo and boilerplate text",
              file: docs.press,
            },
            {
              title: "Release notes",
              description: "What changed recently",
              file: docs.notes,
            },
          ],
        }),
        block("section", {
          heading: "Guides on the blog",
          background: "soft",
          blocks: [
            block("features", {
              columns: "3",
              items: [
                feature(
                  "🧱",
                  "Getting started with blocks",
                  "A ten-minute tour of the editor.",
                  "/blog/getting-started-with-blocks",
                ),
                feature(
                  "🗂️",
                  "Organizing your files",
                  "Folders, file types and downloads.",
                  "/blog/organizing-your-files",
                ),
                feature(
                  "🛠️",
                  "Building a custom block",
                  "Add your own block with one JSX file.",
                  "/blog/building-a-custom-block",
                ),
              ],
            }),
          ],
        }),
        block("accordion", {
          heading: "About these files",
          items: [
            {
              question: "May I share these documents?",
              answer:
                "Yes. All documents on this page may be shared freely inside your organization.",
            },
            {
              question: "May I use the logo in articles?",
              answer:
                "Yes, as long as it is not changed. The press kit contains the logo and a short boilerplate text.",
            },
          ],
        }),
        block("notice", {
          kind: "success",
          title: "Need something else?",
          text: "[Contact us](/contact) and we'll be happy to help.",
        }),
      ],
    },

    // ------------------------------------------------------------------------ blog
    {
      type: "page",
      slug: "/blog",
      title: "Blog",
      meta: nav(5, "Notes on building websites with blocks, JSX and SQLite."),
      blocks: [
        block("hero", {
          heading: "Blog",
          text: "Practical notes on building and running websites with blocks, JSX and SQLite, written by the people who make Jeasx CMS.",
          align: "left",
        }),
        block("articles", { heading: "Latest articles", limit: 12 }),
        block("section", {
          heading: "What we write about",
          background: "soft",
          blocks: [
            block("features", {
              columns: "3",
              items: [
                feature(
                  "🧭",
                  "Editing",
                  "Hands-on guides for editors: from the first block to a complete landing page.",
                ),
                feature(
                  "🎨",
                  "Design",
                  "Layout, typography and structure for pages that are easy to read.",
                ),
                feature(
                  "🛠️",
                  "Development",
                  "Custom blocks, page types and deployment for developers.",
                ),
              ],
            }),
          ],
        }),
        block("cta", {
          heading: "Have a topic in mind?",
          text: "Tell us what you'd like to read about next. We answer every message.",
          buttons: [
            { label: "Suggest a topic", url: "/contact", primary: true },
          ],
        }),
      ],
    },
    {
      type: "article",
      slug: "/blog/getting-started-with-blocks",
      title: "Getting started with blocks",
      meta: article(
        "A tour of the editor: adding, editing and arranging blocks.",
        "Sam Lee",
        "2026-10-21",
        img.sunset,
      ),
      blocks: [
        text(
          "Getting started with blocks",
          "Every page in Jeasx CMS is a list of **blocks**: a hero at the top, some text, an image, a call to action. Instead of filling in a long form, you work directly on the page your visitors will see.\n\nThis tour walks you through the editor in about ten minutes. All you need is an account and a page to practice on.",
        ),
        block("image", {
          src: img.sunset,
          alt: "Orange and pink abstract gradient",
          caption:
            "Images come from the file library and can be swapped with one click.",
        }),
        text(
          "Opening a page",
          "Sign in to the admin and choose a page from the list. The page opens exactly as it looks on the website, with a slim toolbar at the top.\n\nHover over any block and a frame appears around it, together with a small toolbar:\n\n- **Edit** opens all fields of the block beside the page\n- the **arrows** move the block up or down\n- the **handle** lets you drag it to any other place\n- the **trash can** removes it",
        ),
        text(
          "Changing text",
          "Click a heading or paragraph and start typing. Formatting is kept simple on purpose: **bold**, *italic*, links and lists cover almost everything a website needs, and the result always matches the design of your site.\n\nFields that are not text, such as images, colors or links, open in the panel beside the page. The preview updates while you type.",
        ),
        block("notice", {
          kind: "info",
          title: "Tip",
          text: "Press **Ctrl/⌘ + S** to save at any time. Unsaved changes are marked in the toolbar, so nothing gets lost by accident.",
        }),
        text(
          "Adding blocks",
          "Click the round **＋** button between two blocks to insert a new one. The picker only shows blocks that are allowed in that place: an article, for example, offers text, images and quotes, but no pricing tables.\n\nNew blocks start with sensible defaults. Replace the placeholder text, pick an image and you're done.",
        ),
        block("accordion", {
          heading: "Common first questions",
          items: [
            {
              question: "Can visitors see my unsaved changes?",
              answer:
                "No. Visitors only see what you have saved on a published page.",
            },
            {
              question: "What if I delete the wrong block?",
              answer:
                "Use undo right away, or restore an earlier version from the page **History** later.",
            },
            {
              question: "Can two people edit the same page?",
              answer:
                "Yes, but not at the same moment: the editor warns you if the page was changed since you opened it.",
            },
          ],
        }),
        block("download", {
          heading: "Keep it handy",
          items: [
            {
              title: "Getting started guide",
              description: "The tour as a PDF",
              file: docs.guide,
            },
          ],
        }),
      ],
    },
    {
      type: "article",
      slug: "/blog/designing-with-sections",
      title: "Designing with sections",
      meta: article(
        "How sections and columns help you structure long pages.",
        "Jordan Kim",
        "2026-10-30",
        img.aurora,
      ),
      blocks: [
        text(
          "Designing with sections",
          "Long pages are easier to read when related content is grouped. Visitors scan before they read, and clear groups tell them at a glance where one topic ends and the next begins.\n\nJeasx CMS has two blocks for this: a **Section** puts several blocks on a shared background, and **Columns** place blocks side by side.",
        ),
        block("image", {
          src: img.aurora,
          alt: "Blue and violet abstract gradient",
          wide: true,
        }),
        text(
          "Sections: one topic, one background",
          "A section has an optional heading and a background: plain, soft, accent or dark. Use backgrounds sparingly and with a purpose:\n\n- **soft** for supporting content such as numbers or values\n- **accent** for the one thing you want everybody to notice\n- **dark** for quotes and short statements\n\nAlternating plain and soft sections creates a calm rhythm on long pages.",
        ),
        text(
          "Columns: side by side",
          "Columns come in three ratios: equal, wide left and wide right. A wide text column next to an image is the classic combination; three equal columns work well for short, parallel statements.\n\nOn small screens, columns stack automatically, so you never have to build a separate mobile version.",
        ),
        block("table", {
          heading: "Which layout for which content?",
          rows: "Content | Layout | Background\nKey numbers | Section with stats | Soft\nText with picture | Wide-left columns | Plain\nThree values or benefits | Equal columns | Soft\nCustomer quote | Section with quote | Dark\nMain call to action | Call to action block | Accent",
        }),
        text(
          "Nesting",
          "Sections can contain columns, and columns can contain text, images, tables and more. Two levels are usually enough: if you find yourself nesting deeper, the page probably wants to be split into two.",
        ),
        block("quote", {
          quote:
            "Good structure is invisible. Readers just find what they came for.",
          author: "Jordan Kim",
          role: "Design",
        }),
      ],
    },
    {
      type: "article",
      slug: "/blog/organizing-your-files",
      title: "Organizing your files",
      meta: article(
        "Folders, file types and downloads in the file library.",
        "Maya Okafor",
        "2026-11-05",
        img.forest,
      ),
      blocks: [
        text(
          "Organizing your files",
          "After a few months, every website collects hundreds of files: photos, logos, PDFs, spreadsheets. The file library keeps them in one place and makes sure every page uses the right one.\n\nHere is how we organize the files of our own website, and why.",
        ),
        text(
          "Start with a few folders",
          "Create folders for the *kind* of content, not for single pages. Pages change, but a logo stays a logo. Our structure looks like this:\n\n- **Images** for photos and illustrations\n- **Team** for portraits\n- **Brands** for customer and partner logos\n- **Documents** for PDFs, spreadsheets and archives\n\nTo move files, select them and drag them onto a folder.",
        ),
        block("image", {
          src: img.forest,
          alt: "Green abstract gradient",
          caption:
            "Any file type can be stored: images, documents, audio, video and archives.",
        }),
        block("table", {
          heading: "How files are delivered",
          rows: "File type | In the browser | Typical use\nImages (PNG, JPG, SVG, WebP) | Displayed | Heroes, galleries, logos\nAudio and video | Played | Podcasts, product demos\nPDF and plain text | Displayed | Guides, release notes\nEverything else | Downloaded | Spreadsheets, archives",
          caption:
            "File URLs change whenever the content changes, so browsers never show an outdated version.",
        }),
        text(
          "Name files for people",
          "Give files names your colleagues will understand in a year: *product-sheet-2026.pdf* beats *final_v3_new.pdf*. Visitors see the name when they download a file, too.\n\nAlways fill in the alternative text of an image. It helps people using screen readers and search engines alike.",
        ),
        block("notice", {
          kind: "warning",
          title: "Before you delete",
          text: "The library warns you if a file is still used on a page. Replace it there first, then delete it.",
        }),
      ],
    },
    {
      type: "article",
      slug: "/blog/restoring-earlier-versions",
      title: "Restoring earlier versions",
      meta: article(
        "Every save is kept, so mistakes are easy to undo.",
        "Leo Martin",
        "2026-11-10",
        img.ocean,
      ),
      blocks: [
        text(
          "Restoring earlier versions",
          "Everybody has deleted the wrong paragraph at some point. In Jeasx CMS this is no reason to panic: every save keeps the version it replaces, and you can bring it back in a few clicks.",
        ),
        text(
          "Finding a version",
          "Open **History** in the editor toolbar. You'll see a list of all saved versions with date, time and author. Select one, and the page shows that version in place, exactly as it was published.\n\nCompare it with the current page, then decide: restore it, or close the history and carry on.",
        ),
        block("gallery", {
          columns: "2",
          images: [
            {
              src: img.ocean,
              alt: "Blue abstract gradient",
              caption: "Version from Monday",
            },
            {
              src: img.studio,
              alt: "Violet abstract gradient",
              caption: "Current version",
            },
          ],
        }),
        text(
          "Nothing is lost",
          "Restoring is a normal change: the restored version appears in the editor, you save it, and the version it replaces stays in the history as well. You can always go back to where you were.",
        ),
        block("notice", {
          kind: "success",
          title: "Good to know",
          text: "History also covers page settings such as title, address and navigation, not just the blocks.",
        }),
        block("quote", {
          quote:
            "The history feature turned 'Who changed this?' from a support ticket into a ten-second check.",
          author: "Priya Shah",
          role: "Editor, Fieldnote",
        }),
      ],
    },
    {
      type: "article",
      slug: "/blog/writing-for-the-web",
      title: "Writing for the web",
      meta: article(
        "Five habits that make web pages easier to read.",
        "Sam Lee",
        "2026-11-14",
        img.studio,
      ),
      blocks: [
        text(
          "Writing for the web",
          "Most visitors don't read a web page from top to bottom. They scan headings, look at pictures and stop where something catches their eye. Good web writing works with this habit, not against it.\n\nThese five habits have helped our customers more than any design change.",
        ),
        text(
          "1. Lead with the answer",
          "Put the most important sentence first. If visitors read only one line of a section, it should be the one that matters.",
        ),
        text(
          "2. One idea per paragraph",
          "Short paragraphs are easier to scan. When a paragraph covers two ideas, split it in two.",
        ),
        text(
          "3. Headings that say something",
          "*Overview* says nothing. *Plans start at €0* says a lot. Write headings a reader could understand without the text below.",
        ),
        block("quote", {
          quote: "Write the way you'd explain it to a colleague over coffee.",
          author: "Sam Lee",
          role: "Product",
        }),
        text(
          "4. Use lists for steps and options",
          "Whenever you write *first*, *then* and *finally*, a list is probably clearer:\n\n- easier to scan\n- easier to remember\n- easier to update later",
        ),
        text(
          "5. Link with meaning",
          "*Click here* tells nobody where a link goes. Use the destination as the label: *see our [pricing](/pricing)* or *read the [FAQ](/faq)*.",
        ),
        block("notice", {
          kind: "info",
          title: "Try it now",
          text: "Pick one page of your website and rewrite only its headings. You'll be surprised how much clearer it gets.",
        }),
      ],
    },
    {
      type: "article",
      slug: "/blog/building-a-custom-block",
      title: "Building a custom block",
      meta: article(
        "How developers add a new block with one JSX file.",
        "Maya Okafor",
        "2026-11-17",
        img.team,
      ),
      blocks: [
        text(
          "Building a custom block",
          "The blocks that ship with Jeasx CMS cover most websites, but sooner or later every project needs something of its own: an opening-hours table, a job listing, a product teaser. Adding one takes a single file.",
        ),
        text(
          "Define the fields",
          "A block is a JSX component plus a list of fields. Each field has a type such as `text`, `richtext`, `image`, `boolean` or `list`, and a label for the editor. From this list, the CMS builds the editing panel, validates input and fills in defaults.",
        ),
        text(
          "Render on the server",
          "The component receives the field values and returns plain HTML. Blocks run on the server only, so there is no client bundle to maintain and pages stay fast.\n\nTo make a text editable right on the page, spread the field helper on the element that shows it. Everything else is ordinary JSX.",
        ),
        text(
          "Register and style",
          "Finally, add the block to `cms.config.ts`, decide on which page types it is allowed, and add a few lines of CSS. Restart the dev server and the block appears in the picker.",
        ),
        block("table", {
          heading: "Checklist",
          rows: "Step | File | Time\nFields and component | src/blocks/MyBlock.tsx | 10 minutes\nRegister block | src/cms.config.ts | 1 minute\nStyles | src/styles/blocks.css | 10 minutes\nTry it in the editor | Admin | 5 minutes",
        }),
        block("notice", {
          kind: "info",
          title: "Start from an existing block",
          text: "The Quote and Notice blocks are short and make good templates for your own.",
        }),
      ],
    },

    // ------------------------------------------------------------------------ support
    {
      type: "page",
      slug: "/faq",
      title: "FAQ",
      meta: {
        ...nav(6, "Answers to frequently asked questions."),
        inNav: false,
        inFooter: true,
      },
      blocks: [
        block("hero", {
          heading: "Frequently asked questions",
          text: "Quick answers for editors, developers and everybody deciding on a CMS.",
          align: "left",
        }),
        block("accordion", {
          heading: "For editors",
          items: [
            {
              question: "How do I change a text?",
              answer:
                "Click the text on the page and start typing. Save with **Ctrl/⌘ + S**.",
            },
            {
              question: "When do changes go live?",
              answer:
                "As soon as you **save** a published page. Drafts stay private until you publish them.",
            },
            {
              question: "Can I undo a change?",
              answer:
                "Yes. Every save is kept in the page's **History** and can be restored.",
            },
            {
              question: "How do I add a page to the navigation?",
              answer:
                "Open the page settings, switch on **Show in navigation** and choose a position.",
            },
            {
              question: "Which image sizes should I upload?",
              answer:
                "Images around 1600 pixels wide look sharp on large screens and still load quickly.",
            },
          ],
        }),
        block("accordion", {
          heading: "For developers",
          items: [
            {
              question: "How do I add a block?",
              answer:
                "Create a file in `src/blocks`, then add it to `cms.config.ts`. See [Building a custom block](/blog/building-a-custom-block).",
            },
            {
              question: "Where is the content stored?",
              answer:
                "In one SQLite database; uploaded files are stored next to it.",
            },
            {
              question: "How do I back up a site?",
              answer:
                "Copy the data directory. It contains the database and all files, nothing else is needed.",
            },
            {
              question: "Which Node.js version is required?",
              answer: "Node.js 24 or newer.",
            },
          ],
        }),
        block("accordion", {
          heading: "Plans and billing",
          items: [
            {
              question: "Is there a free plan?",
              answer:
                "Yes. The [Starter plan](/pricing) is free for one website.",
            },
            {
              question: "Can I cancel at any time?",
              answer:
                "Yes. All plans are billed monthly without a minimum term.",
            },
          ],
        }),
        block("cta", {
          heading: "Still have a question?",
          text: "Our team usually answers within one business day.",
          buttons: [
            { label: "Contact us", url: "/contact", primary: true },
            { label: "Browse resources", url: "/resources", primary: false },
          ],
        }),
      ],
    },
    {
      type: "page",
      slug: "/contact",
      title: "Contact",
      meta: nav(7, "Get in touch with the Jeasx CMS team."),
      blocks: [
        block("hero", {
          heading: "Let's talk",
          text: "Questions about plans, a demo for your team or help with a project: we'd love to hear from you.",
          align: "left",
        }),
        block("features", {
          columns: "3",
          items: [
            feature(
              "✉️",
              "Email",
              "[hello@example.com](mailto:hello@example.com)\n\nWe reply within one business day.",
            ),
            feature(
              "☎️",
              "Phone",
              "+49 30 0000 0000\n\nMonday to Friday, 9:00 to 17:00 CET.",
            ),
            feature(
              "📍",
              "Office",
              "Example Street 1\n12345 Example City\nGermany",
            ),
          ],
        }),
        block("columns", {
          ratio: "wide-left",
          align: "center",
          columns: [
            {
              blocks: [
                text(
                  "Book a demo",
                  "In 30 minutes, we show you the editor with your own content in mind and answer all questions of your team.\n\n- a live tour of the editor\n- tips for migrating your current site\n- an honest answer whether Jeasx CMS fits your needs",
                ),
              ],
            },
            {
              blocks: [
                block("image", {
                  src: img.ocean,
                  alt: "Blue abstract gradient",
                }),
              ],
            },
          ],
        }),
        block("team", {
          heading: "Who you'll talk to",
          members: [
            {
              photo: people.leo,
              name: "Leo Martin",
              role: "Customer Success",
              bio: "Onboarding, training and day-to-day questions.",
            },
            {
              photo: people.sam,
              name: "Sam Lee",
              role: "Product",
              bio: "Demos, plans and the roadmap.",
            },
          ],
        }),
        block("section", {
          background: "dark",
          blocks: [
            block("quote", {
              quote:
                "Fast answers, friendly people. We had our questions answered before lunch.",
              author: "Priya Shah",
              role: "Editor, Fieldnote",
            }),
          ],
        }),
      ],
    },
    {
      type: "page",
      slug: "/imprint",
      title: "Imprint",
      meta: legal("Legal information about this website."),
      blocks: [
        block("notice", {
          kind: "warning",
          title: "Sample text",
          text: "This is placeholder content for a demo website. Replace it with your own legal information.",
        }),
        text(
          "Imprint",
          "**Example Company GmbH**\nExample Street 1\n12345 Example City\nGermany",
        ),
        text(
          "Contact",
          "Phone: +49 30 0000 0000\nEmail: [hello@example.com](mailto:hello@example.com)",
        ),
        text(
          "Company details",
          "Managing directors: Sam Lee, Maya Okafor\nRegister court: Local Court Example City\nRegistration number: HRB 000000\nVAT ID: DE000000000",
        ),
        text("Responsible for content", "Sam Lee, address as above."),
        text(
          "Liability for links",
          "This website contains links to external websites. We have no influence on their content and therefore cannot accept any liability for it. The respective provider is always responsible for the content of linked pages.",
        ),
      ],
    },
    {
      type: "page",
      slug: "/privacy",
      title: "Privacy",
      meta: legal("How this website handles personal data."),
      blocks: [
        block("notice", {
          kind: "warning",
          title: "Sample text",
          text: "This is placeholder content for a demo website. Replace it with your own privacy policy.",
        }),
        text(
          "Privacy policy",
          "We take the protection of your personal data seriously. This page explains which data we collect when you visit this website, why we collect it and what rights you have.",
        ),
        text(
          "Controller",
          "Example Company GmbH, Example Street 1, 12345 Example City, Germany\nEmail: [privacy@example.com](mailto:privacy@example.com)",
        ),
        text(
          "Server logs",
          "When you visit this website, our server automatically records technical data:\n\n- IP address\n- date and time of the request\n- requested page and referring page\n- browser and operating system\n\nWe need this data to deliver the website and keep it secure. Logs are deleted after 14 days.",
        ),
        text(
          "Cookies and tracking",
          "This website does not use tracking, analytics or advertising cookies for visitors. Only signed-in editors receive a cookie that keeps them logged in to the admin.",
        ),
        block("table", {
          heading: "Overview",
          rows: "Data | Purpose | Storage period\nServer logs | Delivery and security | 14 days\nContact emails | Answering your request | Until resolved\nEditor session cookie | Admin login | Until logout",
        }),
        text(
          "Your rights",
          "You have the right to access, correct and delete your personal data, to restrict its processing and to object to it. You may also lodge a complaint with a data protection authority.\n\nTo exercise your rights, write to [privacy@example.com](mailto:privacy@example.com).",
        ),
      ],
    },

    // ------------------------------------------------------------------------ draft
    {
      type: "page",
      slug: "/spring-campaign",
      title: "Spring campaign (draft)",
      status: "draft",
      meta: {
        description:
          "Spring offer: three months of the Team plan for the price of one.",
        inNav: false,
        navOrder: 0,
        inFooter: false,
      },
      blocks: [
        block("hero", {
          heading: "Spring cleaning for your website",
          text: "Three months of the **Team plan** for the price of one. Offer valid from March 1 to April 30.",
          image: img.forest,
          ctaLabel: "Claim the offer",
          ctaUrl: "/contact",
          align: "center",
        }),
        block("notice", {
          kind: "info",
          title: "Draft",
          text: "This page is not published yet and is only visible in the admin.",
        }),
        block("features", {
          heading: "Why switch now",
          columns: "3",
          items: [
            feature(
              "🌱",
              "Fresh start",
              "Move your content over in a day with our migration checklist.",
            ),
            feature(
              "🎓",
              "Free training",
              "A one-hour session for your whole editorial team.",
            ),
            feature(
              "💶",
              "Save €58",
              "Pay for one month of the Team plan, get three.",
            ),
          ],
        }),
        block("timeline", {
          heading: "How it works",
          items: [
            {
              date: "Day 1",
              title: "Sign up",
              text: "Choose the Team plan with code SPRING.",
            },
            {
              date: "Week 1",
              title: "Migrate",
              text: "Import your pages with our help.",
            },
            {
              date: "Week 2",
              title: "Go live",
              text: "Publish your new site and invite editors.",
            },
          ],
        }),
        block("cta", {
          heading: "Ready for spring?",
          text: "The offer ends on April 30.",
          buttons: [
            { label: "Claim the offer", url: "/contact", primary: true },
            { label: "Compare plans", url: "/pricing", primary: false },
          ],
        }),
      ],
    },
  ];
}
