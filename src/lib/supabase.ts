import { createClient } from "@supabase/supabase-js";

function getEnv(key: string) {
  try {
    if (typeof process !== "undefined" && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}
  try {
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) {}
  return "";
}

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL") || getEnv("VITE_SUPABASE_URL") || "https://placeholder.supabase.co";
const supabaseKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") || getEnv("VITE_SUPABASE_ANON_KEY") || "placeholder_key";

if (!supabaseUrl || !supabaseKey) {
  console.warn("Missing Supabase credentials");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
