import { build } from "vite";

// UI smoke tests use browser-local demo sessions and must never contact a hosted Supabase project.
process.env.VITE_SUPABASE_URL = "";
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "";

await build();
