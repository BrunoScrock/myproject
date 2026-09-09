import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config.js';

let supabaseInstance = null;

export function getSupabase() {
    if (!supabaseInstance) {
        supabaseInstance = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
    }
    return supabaseInstance;
}

export async function getCurrentUser() {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
}

export function onAuthStateChange(callback) {
    const supabase = getSupabase();
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(session?.user || null, event);
    });
}
