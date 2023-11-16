import { createTranslations } from "./plugin.js";
import 'dotenv/config';

await createTranslations(process.cwd(), {
  defaultLocale: "pt",
  folder: "src/locales",
  locales: ["pt", "en", "es"],
  projectId: process.env.PROJECT_ID as string
});