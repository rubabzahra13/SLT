import { apiClient } from "./client";

export type UserAccessLevel = "Full Access" | "View Only";

export type User = {
  id: string;
  name: string;
  email: string;
  access_level: UserAccessLevel;
  is_active: boolean;
};

export type LoginResponse = {
  token: string;
  user: User;
};

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>("/api/auth/login", { email, password });
}

export async function fetchMeApi(token: string): Promise<User> {
  return apiClient.get<User>("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function logoutApi(token: string): Promise<void> {
  try {
    await apiClient.post<{ message: string }>("/api/auth/logout", undefined, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Ignore error on logout
  }
}
