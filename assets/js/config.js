export const CONFIG = {
    authorizedEmail: import.meta.env.VITE_AUTHORIZED_EMAIL || "SEU_EMAIL_GOOGLE",

    supabase: {
        url: import.meta.env.VITE_SUPABASE_URL || "",
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ""
    }
};
