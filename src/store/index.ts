import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";

import { createUserSlice } from "./user/user.slice";


export const useStore = create<
    ReturnType<typeof createUserSlice>
>()(
  devtools(
    persist(
      (...a) => ({
        ...createUserSlice(...a),
      }),
      {
        name: "concerto-store",
      }
    ),
    {
      name: "concerto-store",
    }
  )
);