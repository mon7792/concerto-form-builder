"use client";

import { StateCreator } from "zustand";

import { UserResponse } from "@/features/auth/types";

interface UserSlice {
  user: UserResponse | null;
  tokens: number | null;
  setUserResponse: (user: UserResponse) => void;
  setTokens: (tokens: number) => void;
}

export const createUserSlice: StateCreator<UserSlice, [], [], UserSlice> = (
  set
) => ({
  user: null,
  tokens: null,
  setUserResponse: (user: UserResponse) => {
    set({ user });
  },
  setTokens: (tokens: number) => {
    set({ tokens });
  },
});
