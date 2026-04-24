import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
    Mail, 
    MessageSquare, 
    Clock, 
    User, 
    ChevronRight, 
    Filter, 
    Search,
    CheckCircle2,
    Trash2,
    Eye,
    ShieldAlert
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/app/components/ui/badge";
import { ActionConfirmModal } from "@/app/components/ui/ActionConfirmModal";

export default function AdminInquiries() {
    const [inquiries, setInquiries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        fetchInquiries();
    }, [statusFilter]);

    const fetchInquiries = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('contact_inquiries')
                .select('*')
                .order('created_at', { ascending: false });

            if (statusFilter !== "all") {
                query = query.eq('status', statusFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setInquiries(data || []);
        } catch (error: any) {
            toast.error("Failed to load inquiries");
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            const { error } = await supabase
                .from('contact_inquiries')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
            toast.success(`Marked as ${status}`);
            fetchInquiries();
            if (selectedInquiry?.id === id) {
                setSelectedInquiry({ ...selectedInquiry, status });
            }
        } catch (error: any) {
            toast.error("Update failed");
        }
    };

    const deleteInquiry = async () => {
        if (!deleteId) return;
        try {
            const { error } = await supabase
                .from('contact_inquiries')
                .delete()
                .eq('id', deleteId);

            if (error) throw error;
            toast.success("Inquiry deleted");
            setInquiries(inquiries.filter(i => i.id !== deleteId));
            if (selectedInquiry?.id === deleteId) setSelectedInquiry(null);
        } catch (error: any) {
            toast.error("Delete failed");
        } finally {
            setDeleteId(null);
        }
    };

    const filteredInquiries = inquiries.filter(inquiry => 
        inquiry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inquiry.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inquiry.subject?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 space-y-8 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-950 tracking-tight flex items-center gap-3">
                        <MessageSquare className="size-8 text-emerald-600" />
                        Contact Inquiries
                    </h1>
                    <p className="text-slate-500 font-medium">Manage messages from potential customers.</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
                {/* List Side */}
                <div className={`${selectedInquiry ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-6 transition-all duration-500`}>
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-white border-b border-slate-100 py-6">
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                    <Input 
                                        placeholder="Search by name, email or subject..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 h-11 border-slate-200 focus:ring-emerald-500"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="h-11 px-4 bg-slate-50 text-slate-600 border-slate-200">
                                        <Filter className="size-3.5 mr-2" />
                                        Filter:
                                    </Badge>
                                    <select 
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="h-11 px-4 rounded-md border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="all">All Messages</option>
                                        <option value="pending">Pending</option>
                                        <option value="read">Read</option>
                                        <option value="responded">Responded</option>
                                    </select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                {loading ? (
                                    <div className="p-12 text-center text-slate-400 font-medium">Loading messages...</div>
                                ) : filteredInquiries.length === 0 ? (
                                    <div className="p-12 text-center space-y-4">
                                        <div className="size-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                                            <Mail className="size-8 text-slate-400" />
                                        </div>
                                        <p className="text-slate-500 font-medium">No inquiries found.</p>
                                    </div>
                                ) : (
                                    filteredInquiries.map((inquiry) => (
                                        <div 
                                            key={inquiry.id}
                                            onClick={() => setSelectedInquiry(inquiry)}
                                            className={`group p-6 hover:bg-slate-50 transition-all cursor-pointer relative ${selectedInquiry?.id === inquiry.id ? 'bg-emerald-50/50 border-l-4 border-l-emerald-500' : 'border-l-4 border-l-transparent'}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="space-y-1">
                                                    <h3 className="font-bold text-slate-950 flex items-center gap-2">
                                                        {inquiry.name}
                                                        {inquiry.status === 'pending' && <span className="size-2 bg-emerald-500 rounded-full animate-pulse" />}
                                                    </h3>
                                                    <p className="text-sm text-slate-500 font-medium">{inquiry.email}</p>
                                                </div>
                                                <Badge className={
                                                    inquiry.status === 'pending' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                                                    inquiry.status === 'read' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                                                    'bg-slate-100 text-slate-700 hover:bg-slate-100'
                                                }>
                                                    {inquiry.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm font-bold text-slate-700 truncate mb-2">{inquiry.subject}</p>
                                            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="size-3" />
                                                    {format(new Date(inquiry.created_at), 'MMM d, h:mm a')}
                                                </span>
                                                <ChevronRight className={`size-4 transition-transform ${selectedInquiry?.id === inquiry.id ? 'rotate-90 text-emerald-600' : 'group-hover:translate-x-1'}`} />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Detail Side */}
                {selectedInquiry && (
                    <div className="lg:col-span-7 animate-in fade-in slide-in-from-right-4 duration-500">
                        <Card className="border-slate-200 shadow-xl overflow-hidden sticky top-8">
                            <CardHeader className="bg-slate-950 text-white p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="space-y-2">
                                        <Badge className="bg-emerald-500 text-slate-950 font-black uppercase text-[10px] tracking-widest">
                                            {selectedInquiry.status}
                                        </Badge>
                                        <h2 className="text-2xl font-black tracking-tight">{selectedInquiry.subject || "No Subject"}</h2>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-white hover:bg-white/10"
                                        onClick={() => setSelectedInquiry(null)}
                                    >
                                        <X className="size-5" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-6 items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-white/10 flex items-center justify-center">
                                            <User className="size-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-white/40">From</p>
                                            <p className="text-sm font-bold">{selectedInquiry.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-white/10 flex items-center justify-center">
                                            <Mail className="size-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-white/40">Email</p>
                                            <p className="text-sm font-bold">{selectedInquiry.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-white/10 flex items-center justify-center">
                                            <Clock className="size-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-white/40">Received</p>
                                            <p className="text-sm font-bold">{format(new Date(selectedInquiry.created_at), 'MMMM d, yyyy')}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8 bg-white">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Message Content</h4>
                                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 min-h-[200px]">
                                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                                            {selectedInquiry.message}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            className="h-10 px-4 rounded-xl font-bold border-slate-200 text-slate-700"
                                            onClick={() => updateStatus(selectedInquiry.id, 'read')}
                                            disabled={selectedInquiry.status === 'read'}
                                        >
                                            <Eye className="size-4 mr-2 text-blue-500" />
                                            Mark Read
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            className="h-10 px-4 rounded-xl font-bold border-slate-200 text-slate-700"
                                            onClick={() => updateStatus(selectedInquiry.id, 'responded')}
                                            disabled={selectedInquiry.status === 'responded'}
                                        >
                                            <CheckCircle2 className="size-4 mr-2 text-emerald-500" />
                                            Mark Responded
                                        </Button>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            className="h-10 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                                            onClick={() => window.location.href = `mailto:${selectedInquiry.email}?subject=Re: ${selectedInquiry.subject}`}
                                        >
                                            Reply via Email
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                                            onClick={() => setDeleteId(selectedInquiry.id)}
                                        >
                                            <Trash2 className="size-5" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            <ActionConfirmModal 
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={deleteInquiry}
                title="Delete Inquiry"
                description="Are you sure you want to delete this message? This action cannot be undone."
                variant="destructive"
            />
        </div>
    );
}
