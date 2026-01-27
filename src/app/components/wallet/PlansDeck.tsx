import { useState, useEffect } from "react";
import { PlanCard } from "./PlanCard";

interface PlansDeckProps {
    plans: any[];
    loading?: boolean;
    walletBalance: number;
    onActiveChange?: (activeId: string | 'wallet', type: 'wallet' | 'plan', name: string) => void;
}

export function PlansDeck({ plans, loading, walletBalance, onActiveChange }: PlansDeckProps) {
    // We combine the General Wallet (Virtual Card) with the actual plans
    const [deckItemIds, setDeckItemIds] = useState<string[]>([]);
    const [allItems, setAllItems] = useState<any[]>([]);

    useEffect(() => {
        if (loading) return;

        // Create the virtual wallet item
        const walletItem = {
            id: 'wallet',
            type: 'wallet',
            name: 'General Wallet',
            current_balance: walletBalance,
            // Wallet always exists
        };

        // Standardize plan items
        const planItems = plans.map(p => ({
            ...p,
            type: 'plan'
        }));

        const items = [walletItem, ...planItems];
        setAllItems(items);

        // Initialize order if not set or if plans changed drastically (re-init on load)
        // We only reset if the length is different to avoid resetting rotation on simple updates?
        // Actually, for simplicity, let's just reset order when plans change for now.
        // A smarter diff would be better but complex.
        const ids = items.map(i => i.id);
        setDeckItemIds(ids);

        // Notify parent of initial active item (the top one)
        if (ids.length > 0 && onActiveChange) {
            onActiveChange('wallet', 'wallet', 'General Wallet');
        }

    }, [plans, walletBalance, loading]); // Logic dependency needs care to avoid loops

    const rotateDeck = () => {
        if (deckItemIds.length <= 1) return;

        const newOrder = [...deckItemIds];
        const first = newOrder.shift();
        if (first) newOrder.push(first);

        setDeckItemIds(newOrder);

        // Calculate new active id (the new first item)
        const newActiveId = newOrder[0];
        const activeItem = allItems.find(i => i.id === newActiveId);

        if (activeItem && onActiveChange) {
            onActiveChange(
                activeItem.id,
                activeItem.type,
                activeItem.type === 'wallet' ? 'General Wallet' : (activeItem.plan?.name || 'Savings Plan')
            );
        }
    };

    if (loading) {
        return (
            <div className="w-full max-w-sm aspect-[1.586] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        );
    }

    // Helper to get expiry
    const getExpiry = (item: any) => {
        if (item.type === 'wallet') return undefined;
        const date = new Date(item.start_date);
        date.setMonth(date.getMonth() + (item.plan?.duration_months || 12));
        return date.toISOString();
    };

    return (
        <div className="relative w-full max-w-sm mx-auto perspective-1000">
            {/* Aspect ratio container */}
            <div className="w-full aspect-[1.586] relative">
                {deckItemIds.map((itemId, index) => {
                    const item = allItems.find(i => i.id === itemId);
                    if (!item) return null;

                    return (
                        <PlanCard
                            key={item.id}
                            index={index}
                            total={deckItemIds.length}
                            name={item.type === 'wallet' ? 'General Wallet' : (item.plan?.name || "Savings Plan")}
                            balance={item.current_balance}
                            type={item.type}
                            expiryDate={getExpiry(item)}
                            onClick={rotateDeck}
                        />
                    );
                })}
            </div>

            <div className="text-center mt-6 text-xs text-gray-400 flex items-center justify-center gap-2">
                <span>Tap card to switch</span>
            </div>
        </div>
    );
}
