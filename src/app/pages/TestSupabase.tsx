import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/app/components/ui/button";

export function TestSupabase() {
    const [status, setStatus] = useState<string>("Testing...");
    const [config, setConfig] = useState<any>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        checkConnection();
    }, []);

    async function checkConnection() {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

        setConfig({
            url: url ? `Loaded (${url.substring(0, 15)}...)` : "MISSING",
            key: key ? `Loaded (${key.substring(0, 10)}...)` : "MISSING",
        });

        try {
            // Try to fetch plans as a public test (since we enabled public read on plans)
            // Or just check auth session
            const { data, error } = await supabase.from('plans').select('count', { count: 'exact', head: true });

            if (error) {
                throw error;
            }

            setStatus("Connection Successful! ✅");
        } catch (err: any) {
            console.error(err);
            setStatus("Connection Failed ❌");
            setError(err.message || JSON.stringify(err));
        }
    }

    return (
        <div className="p-10 max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">Supabase Connection Test</h1>

            <div className="p-4 bg-gray-100 rounded-lg space-y-2">
                <h2 className="font-semibold">Configuration</h2>
                <p><strong>URL:</strong> {config.url}</p>
                <p><strong>Key:</strong> {config.key}</p>
            </div>

            <div className={`p-4 rounded-lg border ${status.includes("Success") ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                <h2 className="font-semibold text-xl">{status}</h2>
                {error && <p className="mt-2 font-mono text-sm break-all">{error}</p>}
            </div>

            <div className="pt-4">
                <Button onClick={() => window.location.reload()}>Retry Test</Button>
            </div>
        </div>
    );
}
