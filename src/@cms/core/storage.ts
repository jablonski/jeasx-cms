/** Where the CMS keeps its data (CMS_DB and CMS_FILES, see .env.example). */
export const dbPath = () => process.env.CMS_DB || "data/cms.db";
export const filesDir = () => process.env.CMS_FILES || "data/files";
