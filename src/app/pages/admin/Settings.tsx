import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/app/components/ui/button";
import { Switch } from "@/app/components/ui/switch";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { toast } from "sonner";
import { Save, Mail, Settings as SettingsIcon, ShieldAlert, Megaphone, Trash2 } from "lucide-react";


export function AdminSettings() {
    const [loading, setLoading] = useState(true);
    const [general, setGeneral] = useState<any>({
        withdrawals_enabled: true,
        loan_interest_rate: 5
    });

    const [smtp, setSmtp] = useState<any>({
        host: "",
        port: 587,
        user: "",
        pass: "",
        secure: false,
        from_email: ""
    });
    const [logoUrl, setLogoUrl] = useState("");
    const [templates, setTemplates] = useState<any>({});

    // Announcement State
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [newAnnouncement, setNewAnnouncement] = useState({ message: "", type: "info", expires_at: "" });

    useEffect(() => {
        fetchSettings();
        fetchAnnouncements();
    }, []);

    async function fetchAnnouncements() {
        const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
        if (data) setAnnouncements(data);
    }

    async function createAnnouncement() {
        if (!newAnnouncement.message) return toast.error("Message required");

        const { error } = await supabase.from('announcements').insert({
            message: newAnnouncement.message,
            type: newAnnouncement.type,
            expires_at: newAnnouncement.expires_at || null
        });

        if (error) toast.error("Failed");
        else {
            toast.success("Created");
            setNewAnnouncement({ message: "", type: "info", expires_at: "" });
            fetchAnnouncements();
        }
    }

    async function deleteAnnouncement(id: string) {
        if (!confirm("Delete?")) return;
        await supabase.from('announcements').delete().eq('id', id);
        fetchAnnouncements();
    }

    async function toggleAnnouncement(id: string, current: boolean) {
        await supabase.from('announcements').update({ is_active: !current }).eq('id', id);
        fetchAnnouncements();
    }

    async function fetchSettings() {
        setLoading(true);
        try {
            const { data } = await supabase.from('app_settings').select('*');
            if (data) {
                const generalSettings = data.find(s => s.key === 'general')?.value;
                const smtpSettings = data.find(s => s.key === 'smtp')?.value;
                const templateSettings = data.find(s => s.key === 'email_templates')?.value;

                if (generalSettings) setGeneral(generalSettings);
                if (generalSettings?.logo_url) setLogoUrl(generalSettings.logo_url);
                if (smtpSettings) setSmtp(smtpSettings);
                if (templateSettings) setTemplates(templateSettings);
            }
        } catch (error) {
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    }

    async function saveSettings(key: string, value: any) {
        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({ key, value, description: 'Updated via Admin Panel' });

            if (error) throw error;
            toast.success("Settings saved successfully");
        } catch (error: any) {
            toast.error("Failed to save: " + error.message);
        }
    }

    if (loading) return <div className="p-8">Loading settings...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
                <p className="text-slate-500">Manage global configurations and email systems.</p>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList>
                    <TabsTrigger value="general" className="gap-2"><SettingsIcon className="w-4 h-4" /> General</TabsTrigger>
                    <TabsTrigger value="branding" className="gap-2"><ShieldAlert className="w-4 h-4" /> Branding</TabsTrigger>
                    <TabsTrigger value="email" className="gap-2"><Mail className="w-4 h-4" /> Email & SMTP</TabsTrigger>
                    <TabsTrigger value="announcements" className="gap-2"><Megaphone className="w-4 h-4" /> Announcements</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Global Limits & Toggles</CardTitle>
                            <CardDescription>Control critical system features.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                                <div className="space-y-0.5">
                                    <Label className="text-base font-medium">Enable Withdrawals</Label>
                                    <p className="text-sm text-slate-500">Create global freeze on wallet withdrawals.</p>
                                </div>
                                <Switch
                                    checked={general.withdrawals_enabled}
                                    onCheckedChange={(checked) => setGeneral({ ...general, withdrawals_enabled: checked })}
                                />
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Default Loan Interest Rate (%)</Label>
                                    <Input
                                        type="number"
                                        value={general.loan_interest_rate}
                                        onChange={(e) => setGeneral({ ...general, loan_interest_rate: Number(e.target.value) })}
                                    />
                                    <p className="text-xs text-slate-500">Base rate for new loans setup.</p>
                                </div>

                            </div>

                            <div className="flex justify-end">
                                <Button onClick={() => saveSettings('general', general)} className="bg-emerald-600 hover:bg-emerald-700">
                                    <Save className="w-4 h-4 mr-2" /> Save General Settings
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="email" className="space-y-6 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>SMTP Configuration</CardTitle>
                            <CardDescription>Configure the mail server for system emails.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Host</Label>
                                    <Input value={smtp.host} onChange={e => setSmtp({ ...smtp, host: e.target.value })} placeholder="smtp.gmail.com" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Port</Label>
                                    <Input value={smtp.port} onChange={e => setSmtp({ ...smtp, port: Number(e.target.value) })} placeholder="587" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Username</Label>
                                    <Input value={smtp.user} onChange={e => setSmtp({ ...smtp, user: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Password</Label>
                                    <Input type="password" value={smtp.pass} onChange={e => setSmtp({ ...smtp, pass: e.target.value })} />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>From Email</Label>
                                    <Input value={smtp.from_email} onChange={e => setSmtp({ ...smtp, from_email: e.target.value })} placeholder="noreply@marysthrift.com" />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={() => saveSettings('smtp', smtp)}>
                                    <Save className="w-4 h-4 mr-2" /> Save SMTP Config
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Email Templates</CardTitle>
                            <CardDescription>Edit automated email content.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {Object.keys(templates).map(key => (
                                <div key={key} className="border p-4 rounded-md space-y-3">
                                    <h3 className="font-semibold capitalize text-purple-600">{key.replace('_', ' ')} Email</h3>
                                    <div className="space-y-2">
                                        <Label>Subject</Label>
                                        <Input
                                            value={templates[key].subject}
                                            onChange={(e) => {
                                                const newTemplates = { ...templates };
                                                newTemplates[key].subject = e.target.value;
                                                setTemplates(newTemplates);
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Body</Label>
                                        <Textarea
                                            className="min-h-[100px] font-mono text-sm"
                                            value={templates[key].body}
                                            onChange={(e) => {
                                                const newTemplates = { ...templates };
                                                newTemplates[key].body = e.target.value;
                                                setTemplates(newTemplates);
                                            }}
                                        />
                                        <p className="text-xs text-slate-400">Supported variables: {'{name}, {amount}'}</p>
                                    </div>
                                </div>
                            ))}
                            <div className="flex justify-end">
                                <Button onClick={() => saveSettings('email_templates', templates)}>
                                    <Save className="w-4 h-4 mr-2" /> Save Templates
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>


                <TabsContent value="announcements" className="space-y-6 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Broadcast Announcements</CardTitle>
                            <CardDescription>Create sitewide banners for all users.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 p-4 border rounded bg-slate-50">
                                <Label>New Announcement</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Message..."
                                        value={newAnnouncement.message}
                                        onChange={e => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                                    />
                                    <select
                                        className="border rounded px-2"
                                        value={newAnnouncement.type}
                                        onChange={e => setNewAnnouncement({ ...newAnnouncement, type: e.target.value })}
                                    >
                                        <option value="info">Info (Blue)</option>
                                        <option value="warning">Warning (Yellow)</option>
                                        <option value="error">Error (Red)</option>
                                        <option value="success">Success (Green)</option>
                                    </select>
                                    <Button onClick={createAnnouncement}>Create</Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {announcements.map(a => (
                                    <div key={a.id} className="flex items-center justify-between p-3 border rounded">
                                        <div className="flex items-center gap-3">
                                            <Switch checked={a.is_active} onCheckedChange={() => toggleAnnouncement(a.id, a.is_active)} />
                                            <div>
                                                <p className="font-medium text-sm">{a.message}</p>
                                                <p className="text-xs text-slate-500">
                                                    Type: {a.type} | Created: {new Date(a.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => deleteAnnouncement(a.id)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div >
    );
}
