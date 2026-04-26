import { useEffect, useState } from "react";

import { Send, Clock, Search, Users, Filter, ChevronLeft, ChevronRight, MailCheck, MailX } from "lucide-react";
import { toast } from "sonner";


import { ActionConfirmModal } from "@/app/components/ui/ActionConfirmModal";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Textarea } from "@/app/components/ui/textarea";
import { supabase } from "@/lib/supabase";


export function AdminNewsletter() {
  const [loading, setLoading] = useState(false);
  const [newsletters, setNewsletters] = useState<any[]>([]);
  
  // Subscribers State
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 20;

  // Form State
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sendToAll, setSendToAll] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    fetchHistory();
    fetchSubscribers();
  }, [page, filter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchSubscribers();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);


  async function fetchHistory() {
    try {
      const { data } = await supabase
        .from("newsletters")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setNewsletters(data);
    } catch {
      console.error("Newsletter table missing or error");
    }
  }

  async function fetchSubscribers() {
    setSubLoading(true);
    try {
      let query = supabase
        .from("newsletter_subscribers")
        .select("*", { count: "exact" });

      if (search) {
        query = query.ilike("email", `%${search}%`);
      }

      if (filter === "active") {
        query = query.eq("is_active", true);
      } else if (filter === "inactive") {
        query = query.eq("is_active", false);
      }

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      if (error) throw error;
      setSubscribers(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error("Fetch subscribers error:", err);
      toast.error("Failed to load subscribers");
    } finally {
      setSubLoading(false);
    }
  }

  async function toggleSubscriber(id: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .update({ is_active: !currentStatus })
        .eq("id", id);
      
      if (error) throw error;
      toast.success("Subscriber status updated");
      fetchSubscribers();
    } catch (err: any) {
      toast.error("Failed to update: " + err.message);
    }
  }


  async function handleSend() {
    if (!subject.trim() || !content.trim()) {
      toast.error("Subject and Content are required");
      return;
    }

    setIsConfirmOpen(true);
  }

  async function confirmSend() {
    setIsConfirmOpen(false);

    setLoading(true);
    try {
      // 1. Get Recipients
      let recipients: string[] = [];
      if (sendToAll) {
        const { data: profiles } = await supabase.from("profiles").select("email");
        const { data: subscribers } = await supabase
          .from("newsletter_subscribers")
          .select("email")
          .eq("is_active", true);

        const profileEmails = profiles?.map((p) => p.email).filter(Boolean) || [];
        const subscriberEmails = subscribers?.map((s) => s.email).filter(Boolean) || [];

        // Merge and de-duplicate
        recipients = Array.from(new Set([...profileEmails, ...subscriberEmails]));
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
      const { data: record, error: dbError } = await supabase
        .from("newsletters")
        .insert({
          subject,
          content,
          target_audience: sendToAll ? "all" : "selected",
          recipients: sendToAll ? null : recipients, // Don't store huge list if 'all'
          status: "sending",
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 3. Call Edge Function
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        "send-newsletter",
        {
          body: {
            subject,
            content,
            recipients,
            newsletterId: record.id,
          },
        },
      );

      if (functionError) throw functionError;

      const { successCount, failCount } = functionData || { successCount: 0, failCount: 0 };

      if (failCount > 0) {
        toast.warning(`Newsletter partially sent: ${successCount} success, ${failCount} failed.`);
      } else {
        toast.success(`Newsletter Sent successfully to ${successCount} users!`);
      }

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
        <h1 className="text-2xl font-bold text-slate-900">Newsletter Management</h1>
        <p className="text-slate-500">Manage your audience and communicate with your users.</p>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="campaigns" className="gap-2">
            <Send className="w-4 h-4" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="gap-2">
            <Users className="w-4 h-4" /> Subscribers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-6">
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
                          {sendToAll
                            ? "All active registered users & manual subscribers will receive this."
                            : "Manual selection not yet available."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Message Body</Label>
                    <Textarea
                      className="min-h-[250px]"
                      placeholder="Write your message here... (Markdown supported)"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t pt-4">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleSend}
                    disabled={loading}
                  >
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
                    {newsletters.length === 0 && (
                      <p className="text-sm text-slate-500 italic">No sent newsletters.</p>
                    )}
                    {newsletters.map((n) => (
                      <div key={n.id} className="border-b last:border-0 pb-4 last:pb-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-semibold text-sm line-clamp-1">{n.subject}</h4>
                          <Badge
                            variant="outline"
                            className={n.status === "sent" ? "text-emerald-600 border-emerald-200" : ""}
                          >
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
        </TabsContent>

        <TabsContent value="subscribers">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Newsletter Subscribers</CardTitle>
                  <CardDescription>
                    Total subscribers: <span className="font-bold text-slate-900">{totalCount}</span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search email..."
                      className="pl-10 w-[250px]"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="h-10 border rounded-md px-3 text-sm bg-white"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                      <th className="px-4 py-3 text-left">Email Address</th>
                      <th className="px-4 py-3 text-left">Join Date</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {subLoading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                          Loading subscribers...
                        </td>
                      </tr>
                    ) : subscribers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">
                          No subscribers found.
                        </td>
                      </tr>
                    ) : (
                      subscribers.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium">{sub.email}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(sub.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            {sub.is_active ? (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-slate-100 text-slate-500">
                                Unsubscribed
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSubscriber(sub.id, sub.is_active)}
                              title={sub.is_active ? "Unsubscribe" : "Resubscribe"}
                            >
                              {sub.is_active ? (
                                <MailX className="w-4 h-4 text-red-500" />
                              ) : (
                                <MailCheck className="w-4 h-4 text-emerald-600" />
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalCount > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-slate-500">
                    Showing {(page - 1) * ITEMS_PER_PAGE + 1} to{" "}
                    {Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page * ITEMS_PER_PAGE >= totalCount}
                      onClick={() => setPage(page + 1)}
                    >
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ActionConfirmModal
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={confirmSend}
        title="Send Newsletter"
        description={`Are you sure you want to send this email to ${sendToAll ? "ALL USERS" : "selected users"}? This action cannot be undone.`}
        confirmText="Send Now"
        variant="info"
        isLoading={loading}
      />
    </div>
  );
}
