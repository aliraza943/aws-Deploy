import * as SecureStore from "expo-secure-store";
// 16.16.28.135 test 
// const BASE_URL = "http://51.20.34.207"; // use your machine IP on real device e.g. http://192.168.1.5:3000
const BASE_URL = "http://16.16.28.135"; // use your machine IP on real device e.g. http://192.168.1.5:3000
// 192.168.100.191
// ── Token storage ─────────────────────────────────────────────────────────────
export async function saveTokens(accessToken: string, refreshToken: string) {
    await SecureStore.setItemAsync("accessToken", accessToken);
    await SecureStore.setItemAsync("refreshToken", refreshToken);
}

export async function getAccessToken() {
    return SecureStore.getItemAsync("accessToken");
}

export async function getRefreshToken() {
    return SecureStore.getItemAsync("refreshToken");
}

export async function clearTokens() {
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
}

// ── Refresh access token ──────────────────────────────────────────────────────
async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
        await clearTokens(); // refresh token expired or revoked → force logout
        return null;
    }

    const data = await res.json();
    await SecureStore.setItemAsync("accessToken", data.accessToken); // save new accessToken
    return data.accessToken;
}

// ── Base fetch with auto refresh (interceptor) ────────────────────────────────
// This is the key function — if any request returns 401, it automatically
// refreshes the accessToken and retries the request once
async function apiFetch(path: string, options: RequestInit = {}, retry = true): Promise<any> {
    const accessToken = await getAccessToken();
    console.log("options", options)
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...options.headers,
        },
    });

    // 401 → try to refresh token and retry request once
    if (res.status === 401 && retry) {
        console.log("expired")
        const newAccessToken = await refreshAccessToken();
        if (!newAccessToken) throw new Error("SESSION_EXPIRED"); // caught in screens to redirect to login
        return apiFetch(path, options, false); // retry=false so we don't loop infinitely
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const signup = (email: string, password: string) =>
    apiFetch("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) });

export const login = (email: string, password: string) =>
    apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const logout = async () => {
    const refreshToken = await getRefreshToken();
    await apiFetch("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) });
    await clearTokens();
};

// ── Todos ─────────────────────────────────────────────────────────────────────
export const getTodos = () => apiFetch("/todos");
export const createTodo = (title: string) => apiFetch("/todos", { method: "POST", body: JSON.stringify({ title }) });
export const updateTodo = (id: number, data: object) => apiFetch(`/todos/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteTodo = (id: number) => apiFetch(`/todos/${id}`, { method: "DELETE" });