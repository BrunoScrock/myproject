export const CONFIG = {
    authorizedEmail: "SEU_EMAIL_GOOGLE",

    supabase: {
        url: import.meta.env.VITE_SUPABASE_URL || "",
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ""
    }
};
