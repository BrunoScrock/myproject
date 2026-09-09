import { getSupabase, onAuthStateChange } from './supabase.js';
import { CONFIG } from './config.js';

let currentUser = null;
let onAuthCallback = null;

export function setAuthCallback(cb) {
    onAuthCallback = cb;
}

export function getCurrentUser() {
    return currentUser;
}

export async function signInWithGoogle() {
    const supabase = getSupabase();
    let redirectTo = window.location.origin + window.location.pathname;
    if (!redirectTo.endsWith('/')) redirectTo += '/';

    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo
        }
    });
    if (error) {
        console.error('Erro ao fazer login:', error.message);
        throw new Error('Não foi possível conectar ao servidor de autenticação.');
    }
}

export async function signOut() {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Erro ao sair:', error.message);
    }
    currentUser = null;
}

export function isAuthorized(user) {
    if (!user || !user.email) return false;
    return user.email === CONFIG.authorizedEmail;
}

export function initAuth() {
    const supabase = getSupabase();

    onAuthStateChange(async (user, event) => {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            if (user && isAuthorized(user)) {
                currentUser = user;
                if (onAuthCallback) onAuthCallback(user, 'authorized');
            } else if (user && !isAuthorized(user)) {
                await supabase.auth.signOut();
                currentUser = null;
                if (onAuthCallback) onAuthCallback(null, 'unauthorized');
            } else {
                currentUser = null;
                if (onAuthCallback) onAuthCallback(null, 'signed_out');
            }
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            if (onAuthCallback) onAuthCallback(null, 'signed_out');
        }
    });
}
