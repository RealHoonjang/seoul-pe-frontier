import { createContext, useContext } from 'react';
import type { DataSet } from './lib/data';

export interface AppCtx {
  data: DataSet;
  cart: string[];
  toggleCart: (id: string) => void;
  clearCart: () => void;
  openCart: () => void;
  toast: (msg: string) => void;
}

export const Ctx = createContext<AppCtx | null>(null);
export const useApp = () => useContext(Ctx)!;
