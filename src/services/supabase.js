import { createClient } from '@supabase/supabase-js';

// En un proyecto real, esto iría en un archivo .env, pero para empezar está bien aquí
const SB_URL = "https://muxrbuivopnawnxlcjxq.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11eHJidWl2b3BuYXdueGxjanhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODI5MzIsImV4cCI6MjA4MDM1ODkzMn0._tMDAJg2r5vfR1y0JPYd3LVDB66CcyXtj5dY4RqrxIg";

export const supabase = createClient(SB_URL, SB_KEY);