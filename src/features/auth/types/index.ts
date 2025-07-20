import { User } from "better-auth";

export interface UserResponse
  extends Omit<User, "id" | "emailVerified" | "createdAt" | "updatedAt"> {
  plan: string;
}


export interface UserTokenResponse{
  tokens: number; // total token present in the account
}
