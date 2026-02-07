// app/supabaseClient.js
export function getConfig() {
    const cfg = window.__APP_CONFIG__;
    if (!cfg?.SUPABASE_URL || !cfg?.SUPABASE_ANON_KEY) {
        throw new Error("Falta configurar app/config.js (SUPABASE_URL / SUPABASE_ANON_KEY).");
    }
    return cfg;
}

export function isAllowedEmail(email) {
    const { ALLOWED_EMAIL_DOMAINS } = getConfig();
    const domain = (email || "").split("@")[1]?.toLowerCase() || "";
    return ALLOWED_EMAIL_DOMAINS.map(d => d.toLowerCase()).includes(domain);
}

export async function createSupabaseClient() {
    // Carga dinámica del SDK desde CDN
    // eslint-disable-next-line no-undef
    const supabaseJs = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = getConfig();
    const originalFetch = window.fetch.bind(window);

    function debugFetch(...args) {
        console.log("[FETCH]", args[0]);
        return originalFetch(...args);
    }

    return supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { fetch: debugFetch },
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    });

}
