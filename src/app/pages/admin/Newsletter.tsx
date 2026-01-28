import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { toast } from "sonner";
import { Mail, Send, CheckCircle, Clock } from "lucide-react";
import { Switch } from "@/app/components/ui/switch";
import { Badge } from "@/app/components/ui/badge";

export function AdminNewsletter() {
    const [loading, setLoading] = useState(false);
    const [newsletters, setNewsletters] = useState<any[]>([]);

    // Form State
    const [subject, setSubject] = useState("");
    const [content, setContent] = useState("");
    const [sendToAll, setSendToAll] = useState(true);
    // const [selectedUsers, setSelectedUsers] = useState<string[]>([]); // For future: Multi-select users

    useEffect(() => {
        fetchHistory();
    }, []);

    async function fetchHistory() {
        try {
            const { data, error } = await supabase
                .from('newsletters')
                .select('*')
                .order('created_at', { ascending: false });
            if (data) setNewsletters(data);
        } catch (e) {
            console.log("Newsletter table missing or error");
        }
    }

    async function handleSend() {
        if (!subject.trim() || !content.trim()) {
            toast.error("Subject and Content are required");
            return;
        }

        if (!confirm(`Are you sure you want to send this email to ${sendToAll ? 'ALL USERS' : 'selected users'}? This action cannot be undone.`)) return;

        setLoading(true);
        try {
            // 1. Get Recipients
            let recipients: string[] = [];
            if (sendToAll) {
                const { data } = await supabase.from('profiles').select('email');
                if (data) recipients = data.map(p => p.email).filter(Boolean);
            } else {
                // Determine selected users logic later
                toast.error("Only 'Send to All' is supported in this version.");
                setLoading(false);
                return;
            }

            if (recipients.length === 0) {
                toast.error("No recipients found.");
                setLoading(false);
                return;
            }

            // 2. Insert Record
            const { data: record, error: dbError } = await supabase.from('newsletters').insert({
                subject,
                content,
                target_audience: sendToAll ? 'all' : 'selected',
                recipients: sendToAll ? null : recipients, // Don't store huge list if 'all'
                status: 'sending'
            }).select().single();

            if (dbError) throw dbError;

            // 3. Simulate Sending (In a real app, calls Edge Function or loops SMTP)
            // For MVP client-side demo:
            console.log(`Sending email "${subject}" to ${recipients.length} users...`);

            // Mock delay
            await new Promise(r => setTimeout(r, 2000));

            // 4. Update Status
            await supabase.from('newsletters').update({ status: 'sent', sent_at: new Date() }).eq('id', record.id);

            toast.success(`Newsletter Queued/Sent to ${recipients.length} users!`);
            setSubject("");
            setContent("");
            fetchHistory(); // Refresh list

        } catch (error: any) {
            toast.error("Failed to send: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Newsletter</h1>
                <p className="text-slate-500">Send mass emails to your users.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Compose Column */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Compose Email</CardTitle>
                            <CardDescription>Send an update, announcement, or alert.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Subject Line</Label>
                                <Input
                                    placeholder="e.g. Important System Maintenance"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Audience</Label>
                                <div className="flex items-center gap-4 p-4 border rounded bg-slate-50">
                                    <Switch checked={sendToAll} onCheckedChange={setSendToAll} />
                                    <div className="flex-1">
                                        <p className="font-medium">Send to All Users</p>
                                        <p className="text-xs text-slate-500">
                                            {sendToAll ? "All active registered users will receive this." : "Select specific users (Coming Soon)"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Message Body</Label>
                                <Textarea
                                    className="min-h-[200px]"
                                    placeholder="Write your message here... (Markdown supported)"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end border-t pt-4">
                            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSend} disabled={loading}>
                                <Send className="w-4 h-4 mr-2" />
                                {loading ? "Sending..." : "Send Newsletter"}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* History Column */}
                <div className="space-y-6">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>History</CardTitle>
                            <CardDescription>Recent campaigns</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {newsletters.length === 0 && <p className="text-sm text-slate-500 italic">No sent newsletters.</p>}
                                {newsletters.map(n => (
                                    <div key={n.id} className="border-b last:border-0 pb-4 last:pb-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-semibold text-sm line-clamp-1">{n.subject}</h4>
                                            <Badge variant="outline" className={n.status === 'sent' ? 'text-emerald-600 border-emerald-200' : ''}>
                                                {n.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                                            <Clock className="w-3 h-3" />
                                            {new Date(n.created_at).toLocaleDateString()}
                                        </div>
                                        <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded">
                                            {n.content}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
