import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env?.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY || "placeholder_key";

if (!supabaseUrl || !supabaseKey) {
  console.warn("Missing Supabase credentials");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
