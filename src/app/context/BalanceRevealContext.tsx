import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface BalanceRevealContextType {
  isBalanceHidden: boolean;
  toggleBalanceReveal: () => void;
}

const BalanceRevealContext = createContext<BalanceRevealContextType | undefined>(undefined);

export function BalanceRevealProvider({ children }: { children: ReactNode }) {
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(() => {
    // Initialize from localStorage if available, defaulting to false (show balances)
    const storedPref = localStorage.getItem("mtf_is_balance_hidden");
    return storedPref ? JSON.parse(storedPref) : false;
  });

  const toggleBalanceReveal = () => {
    setIsBalanceHidden((prev) => {
      const newValue = !prev;
      localStorage.setItem("mtf_is_balance_hidden", JSON.stringify(newValue));
      return newValue;
    });
  };

  // Sync state if another tab changes it
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "mtf_is_balance_hidden" && e.newValue !== null) {
        setIsBalanceHidden(JSON.parse(e.newValue));
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <BalanceRevealContext.Provider value={{ isBalanceHidden, toggleBalanceReveal }}>
      {children}
    </BalanceRevealContext.Provider>
  );
}

export function useBalanceReveal() {
  const context = useContext(BalanceRevealContext);
  if (context === undefined) {
    throw new Error("useBalanceReveal must be used within a BalanceRevealProvider");
  }
  return context;
}
