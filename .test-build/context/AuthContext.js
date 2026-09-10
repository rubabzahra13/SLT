"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAMPLE_USERS = void 0;
exports.AuthProvider = AuthProvider;
exports.useAuth = useAuth;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const auth_1 = require("@/lib/api/auth");
exports.SAMPLE_USERS = [
    {
        id: "usr-megan",
        name: "Megan",
        email: "megan@soundslikethat.com",
        access_level: "Full Access",
        is_active: true,
    },
    {
        id: "usr-andrea",
        name: "Andrea",
        email: "apetty@powermusic.com",
        access_level: "Full Access",
        is_active: true,
    },
    {
        id: "usr-lori",
        name: "Lori",
        email: "lori@powermusic.com",
        access_level: "View Only",
        is_active: true,
    },
    {
        id: "usr-dan",
        name: "Dan",
        email: "dan@powermusic.com",
        access_level: "View Only",
        is_active: true,
    },
    {
        id: "usr-steve",
        name: "Steve",
        email: "steve@powermusic.com",
        access_level: "View Only",
        is_active: true,
    },
];
const SAMPLE_PASSWORDS = {
    "megan@soundslikethat.com": "admin",
    "apetty@powermusic.com": "admin",
    "lori@powermusic.com": "view",
    "dan@powermusic.com": "view",
    "steve@powermusic.com": "view",
};
const AuthContext = (0, react_1.createContext)(null);
const STORAGE_KEY = "slt_auth_session";
function AuthProvider({ children }) {
    const [user, setUser] = (0, react_1.useState)(null);
    const [token, setToken] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    // Load saved session on mount
    (0, react_1.useEffect)(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.user && parsed?.token) {
                    setUser(parsed.user);
                    setToken(parsed.token);
                }
            }
        }
        catch {
            // Storage error fallback
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    const login = (0, react_1.useCallback)(async (email, pass) => {
        const cleanEmail = email.trim().toLowerCase();
        const cleanPass = pass.trim();
        try {
            // Try backend API first
            const res = await (0, auth_1.loginApi)(cleanEmail, cleanPass);
            setUser(res.user);
            setToken(res.token);
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: res.user, token: res.token }));
            return;
        }
        catch (apiErr) {
            // Fallback for offline / standalone mode with exact sample credentials
            const sampleUser = exports.SAMPLE_USERS.find((u) => u.email.toLowerCase() === cleanEmail);
            const expectedPass = SAMPLE_PASSWORDS[sampleUser?.email.toLowerCase() || ""];
            if (sampleUser && expectedPass && cleanPass === expectedPass) {
                const fallbackToken = `token-${sampleUser.id}`;
                setUser(sampleUser);
                setToken(fallbackToken);
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: sampleUser, token: fallbackToken }));
                return;
            }
            // Re-throw if error was from backend response or failed credentials
            if (apiErr instanceof Error && apiErr.message.includes("Invalid email or password")) {
                throw apiErr;
            }
            throw new Error("Invalid email or password");
        }
    }, []);
    const logout = (0, react_1.useCallback)(() => {
        if (token) {
            (0, auth_1.logoutApi)(token).catch(() => { });
        }
        setUser(null);
        setToken(null);
        try {
            localStorage.removeItem(STORAGE_KEY);
        }
        catch { }
    }, [token]);
    const isViewOnly = (0, react_1.useMemo)(() => user?.access_level === "View Only", [user]);
    const isAuthenticated = (0, react_1.useMemo)(() => Boolean(user && token), [user, token]);
    const value = (0, react_1.useMemo)(() => ({
        user,
        token,
        isLoading,
        isViewOnly,
        isAuthenticated,
        login,
        logout,
    }), [user, token, isLoading, isViewOnly, isAuthenticated, login, logout]);
    return (0, jsx_runtime_1.jsx)(AuthContext.Provider, { value: value, children: children });
}
function useAuth() {
    const ctx = (0, react_1.useContext)(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return ctx;
}
