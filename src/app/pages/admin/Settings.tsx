import { useEffect, useState } from "react";

import {
  Save,
  Mail,
  Settings as SettingsIcon,
  Image as ImageIcon,
  Megaphone,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Wallet as WalletIcon,
} from "lucide-react";
import { toast } from "sonner";

import { ActionConfirmModal } from "@/app/components/ui/ActionConfirmModal";
import { BrandLogo } from "@/app/components/ui/BrandLogo";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Textarea } from "@/app/components/ui/textarea";
import { useAuth } from "@/app/context/AuthContext";
import { supabase } from "@/lib/supabase";

export function AdminSettings() {
  const { isSuperadmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [general, setGeneral] = useState<any>({
    withdrawals_enabled: true,
    loan_interest_rate: 5,
  });

  const [smtp, setSmtp] = useState<any>({
    host: "",
    port: 587,
    user: "",
    pass: "",
    secure: false,
    from_email: "",
  });
  const [bankDetails, setBankDetails] = useState<any>({
    account_name: "",
    bank_name: "",
    account_number: "",
  });
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  const [templates, setTemplates] = useState<any>({
    welcome: {
      subject: "Welcome to Mary's Thrift Services",
      body: "Hello {name},\n\nWelcome to Mary's Thrift Services! We are excited to have you on board. Start your savings journey today.",
    },
    plan_join: {
      subject: "New Plan Joined: {planName}",
      body: "Hello {name},\n\nYou have successfully joined the {planName} plan. Your financial future starts now!",
    },
    transaction: {
      subject: "Transaction Notification: {status}",
      body: "Hello {name},\n\nYour transaction of {amount} has been {status}. Log in to your dashboard for details.",
    },
    loan: {
      subject: "Loan Application Update: {status}",
      body: "Hello {name},\n\nYour loan application for {amount} has been {status}.",
    },
    newsletter: {
      subject: "New Update from Mary's Thrift",
      body: "Hello,\n\nWe have some exciting news to share with you...",
    },
  });

  // Announcement State
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({
    message: "",
    type: "info",
    expires_at: "",
  });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchAnnouncements();
  }, []);

  async function fetchAnnouncements() {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setAnnouncements(data);
  }

  async function createAnnouncement() {
    if (!newAnnouncement.message) return toast.error("Message required");

    const { error } = await supabase.from("announcements").insert({
      message: newAnnouncement.message,
      type: newAnnouncement.type,
      expires_at: newAnnouncement.expires_at || null,
    });

    if (error) toast.error("Failed");
    else {
      toast.success("Created");
      setNewAnnouncement({ message: "", type: "info", expires_at: "" });
      fetchAnnouncements();
    }
  }

  async function deleteAnnouncement(id: string) {
    setAnnouncementToDelete(id);
    setIsConfirmOpen(true);
  }

  async function confirmDeleteAnnouncement() {
    if (!announcementToDelete) return;
    await supabase.from("announcements").delete().eq("id", announcementToDelete);
    setAnnouncementToDelete(null);
    setIsConfirmOpen(false);
    fetchAnnouncements();
  }

  async function toggleAnnouncement(id: string, current: boolean) {
    await supabase.from("announcements").update({ is_active: !current }).eq("id", id);
    fetchAnnouncements();
  }

  async function fetchSettings() {
    setLoading(true);
    try {
      const { data } = await supabase.from("app_settings").select("*");
      if (data) {
        const generalSettings = data.find((s) => s.key === "general")?.value;
        const smtpSettings = data.find((s) => s.key === "smtp")?.value;
        const templateSettings = data.find((s) => s.key === "email_templates")?.value;
        const bankSettings = data.find((s) => s.key === "bank_details")?.value;

        if (generalSettings) setGeneral(generalSettings);
        if (generalSettings?.logo_url) setLogoUrl(generalSettings.logo_url);
        if (generalSettings?.favicon_url) setFaviconUrl(generalSettings.favicon_url);
        if (smtpSettings) setSmtp(smtpSettings);

        if (templateSettings) {
          setTemplates({ ...templates, ...templateSettings });
        }

        if (bankSettings) {
          setBankDetails(bankSettings);
        }
      }
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingLogo(true);

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `system_logo_${Date.now()}.${fileExt}`;
        const filePath = `branding/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("branding")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("branding").getPublicUrl(filePath);

        setLogoUrl(publicUrl);
        // Also update the general settings object so it's saved when user clicks Save in Branding
        setGeneral({ ...general, logo_url: publicUrl });
        toast.success("Logo uploaded. Remember to save settings.");
      } catch (error: any) {
        toast.error("Logo upload failed: " + error.message);
      } finally {
        setUploadingLogo(false);
      }
    }
  }

  async function handleFaviconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingFavicon(true);

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `system_favicon_${Date.now()}.${fileExt}`;
        const filePath = `branding/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("branding")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("branding").getPublicUrl(filePath);

        setFaviconUrl(publicUrl);
        setGeneral((prev: any) => ({ ...prev, favicon_url: publicUrl }));
        toast.success("Favicon uploaded. Remember to save settings.");
      } catch (error: any) {
        toast.error("Favicon upload failed: " + error.message);
      } finally {
        setUploadingFavicon(false);
      }
    }
  }

  async function saveSettings(key: string, value: any) {
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key, value, description: "Updated via Admin Panel" });

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
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="w-4 h-4" /> General
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <ImageIcon className="w-4 h-4" /> Branding
          </TabsTrigger>
          {isSuperadmin && (
            <TabsTrigger value="security" className="gap-2 font-bold text-emerald-600">
              <ShieldCheck className="w-4 h-4" /> Security
            </TabsTrigger>
          )}
          <TabsTrigger value="email" className="gap-2">
            <Mail className="w-4 h-4" /> Email & SMTP
          </TabsTrigger>
          <TabsTrigger value="bank" className="gap-2">
            <WalletIcon className="w-4 h-4" /> Bank Details
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-2">
            <Megaphone className="w-4 h-4" /> Announcements
          </TabsTrigger>
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
                  <p className="text-sm text-slate-500">
                    Create global freeze on wallet withdrawals.
                  </p>
                </div>
                <Switch
                  checked={general.withdrawals_enabled}
                  onCheckedChange={(checked) =>
                    setGeneral({ ...general, withdrawals_enabled: checked })
                  }
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Platform Name</Label>
                  <Input
                    value={general.app_name || "Mary's Thrift Services"}
                    onChange={(e) => setGeneral({ ...general, app_name: e.target.value })}
                    placeholder="e.g. Mary's Thrift Services"
                  />
                  <p className="text-xs text-slate-500">
                    The display name used across the platform.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Default Loan Interest Rate (%)</Label>
                  <Input
                    type="number"
                    value={general.loan_interest_rate}
                    onChange={(e) =>
                      setGeneral({ ...general, loan_interest_rate: Number(e.target.value) })
                    }
                  />
                  <p className="text-xs text-slate-500">Base rate for new loans setup.</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => saveSettings("general", general)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Save className="w-4 h-4 mr-2" /> Save General Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6 mt-4">
          <Card className="border-emerald-100 shadow-sm">
            <CardHeader className="bg-emerald-50/10">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <ShieldCheck className="w-5 h-5 text-emerald-600" /> Admin Action Authentication
              </CardTitle>
              <CardDescription>
                Secure sensitive administrative actions (like plan creation and data wipes) with a
                dedicated PIN.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Administration PIN
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="••••"
                      maxLength={6}
                      value={general.admin_pin || "1234"}
                      onChange={(e) =>
                        setGeneral({ ...general, admin_pin: e.target.value.replace(/\D/g, "") })
                      }
                      className="font-mono text-lg tracking-[0.5em] max-w-[150px] text-center border-2 border-slate-100 focus:border-emerald-500 rounded-xl"
                    />
                    <Button
                      variant="outline"
                      className="rounded-xl border-slate-200"
                      onClick={() => {
                        const newPin = Math.floor(1000 + Math.random() * 9000).toString();
                        setGeneral({ ...general, admin_pin: newPin });
                        toast.info(`Generated temporarily: ${newPin}. Click Save to apply.`);
                      }}
                    >
                      Generate
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    This PIN is required to authorize critical system changes.
                    <strong> Default PIN is 1234</strong>.
                  </p>
                </div>

                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex gap-4">
                  <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-amber-900 uppercase tracking-tighter">
                      Security Protocol
                    </h4>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      The Administration PIN is a master key. Do not share it over unsecured
                      channels. Actions performed using this PIN are immutable and globally visible
                      in the audit logs.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button
                  onClick={() =>
                    saveSettings("security", { admin_pin: general.admin_pin || "1234" })
                  }
                  className="bg-slate-900 hover:bg-slate-800 shadow-xl rounded-xl h-11 px-6 active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4 mr-2" /> Sync Security Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Branding & Visuals</CardTitle>
              <CardDescription>Customize the look of the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <Label>Platform Logo</Label>
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-slate-50 border-slate-200">
                  {logoUrl ? (
                    <div className="relative group">
                      <BrandLogo src={logoUrl} alt="Logo Preview" size="lg" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => setLogoUrl("")}
                          className="h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 mb-4">No logo uploaded yet</p>
                    </div>
                  )}

                  <div className="mt-4">
                    <input
                      type="file"
                      id="logo-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("logo-upload")?.click()}
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? (
                        "Uploading..."
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4 mr-2" />{" "}
                          {logoUrl ? "Change Logo" : "Upload Logo"}
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-4">
                    Recommended: PNG or SVG with transparent background.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                <Label>Platform Favicon</Label>
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl bg-slate-50 border-slate-200">
                  {faviconUrl ? (
                    <div className="relative group p-2 bg-white rounded-lg shadow-sm">
                      <img src={faviconUrl} alt="Favicon" className="size-8 object-contain" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => setFaviconUrl("")}
                          className="h-6 w-6"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <SettingsIcon className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                      <p className="text-[10px] text-slate-500">No favicon uploaded</p>
                    </div>
                  )}

                  <div className="mt-4">
                    <input
                      type="file"
                      id="favicon-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFaviconUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("favicon-upload")?.click()}
                      disabled={uploadingFavicon}
                    >
                      {uploadingFavicon ? "Uploading..." : "Upload Favicon"}
                    </Button>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-2">Recommended: 32x32 PNG or ICO.</p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={() =>
                    saveSettings("general", {
                      ...general,
                      logo_url: logoUrl,
                      favicon_url: faviconUrl,
                    })
                  }
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Save className="w-4 h-4 mr-2" /> Save Branding
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
                  <Input
                    value={smtp.host}
                    onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input
                    value={smtp.port}
                    onChange={(e) => setSmtp({ ...smtp, port: Number(e.target.value) })}
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={smtp.user}
                    onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={smtp.pass}
                    onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>From Email</Label>
                  <Input
                    value={smtp.from_email}
                    onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })}
                    placeholder="noreply@marysthrift.com"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => saveSettings("smtp", smtp)}>
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
              {Object.keys(templates).map((key) => (
                <div key={key} className="border p-4 rounded-md space-y-3">
                  <h3 className="font-semibold capitalize text-purple-600">
                    {key.replace("_", " ")} Email
                  </h3>
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
                    <p className="text-xs text-slate-400">
                      Supported variables: {"{name}, {amount}"}
                    </p>
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <Button onClick={() => saveSettings("email_templates", templates)}>
                  <Save className="w-4 h-4 mr-2" /> Save Templates
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Deposit Bank Details</CardTitle>
              <CardDescription>Configure the official bank account displayed for user deposits.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 max-w-md">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    value={bankDetails.bank_name}
                    onChange={(e) => setBankDetails({ ...bankDetails, bank_name: e.target.value })}
                    placeholder="e.g. Moniepoint"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input
                    value={bankDetails.account_name}
                    onChange={(e) => setBankDetails({ ...bankDetails, account_name: e.target.value })}
                    placeholder="e.g. HachStacks Technologies"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    value={bankDetails.account_number}
                    onChange={(e) => setBankDetails({ ...bankDetails, account_number: e.target.value })}
                    placeholder="e.g. 1234567890"
                  />
                </div>
              </div>
              <div className="flex justify-start">
                <Button onClick={() => saveSettings("bank_details", bankDetails)}>
                  <Save className="w-4 h-4 mr-2" /> Save Bank Details
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
                    onChange={(e) =>
                      setNewAnnouncement({ ...newAnnouncement, message: e.target.value })
                    }
                  />
                  <select
                    className="border rounded px-2"
                    value={newAnnouncement.type}
                    onChange={(e) =>
                      setNewAnnouncement({ ...newAnnouncement, type: e.target.value })
                    }
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
                {announcements.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={a.is_active}
                        onCheckedChange={() => toggleAnnouncement(a.id, a.is_active)}
                      />
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

      <ActionConfirmModal
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={confirmDeleteAnnouncement}
        title="Delete Announcement"
        description="Are you sure you want to delete this announcement? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
