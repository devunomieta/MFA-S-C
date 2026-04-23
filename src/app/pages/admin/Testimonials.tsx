import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Edit2, Star, CheckCircle2, XCircle, Quote } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Badge } from "@/app/components/ui/badge";

export default function Testimonials() {
    const [testimonials, setTestimonials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTestimonial, setEditingTestimonial] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: "",
        role: "",
        content: "",
        rating: 5,
        image_url: "",
        is_active: true
    });

    useEffect(() => {
        fetchTestimonials();
    }, []);

    async function fetchTestimonials() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('testimonials')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTestimonials(data || []);
        } catch (error: any) {
            toast.error("Failed to load testimonials");
        } finally {
            setLoading(false);
        }
    }

    const handleOpenDialog = (testimonial?: any) => {
        if (testimonial) {
            setEditingTestimonial(testimonial);
            setFormData({
                name: testimonial.name,
                role: testimonial.role || "",
                content: testimonial.content,
                rating: testimonial.rating || 5,
                image_url: testimonial.image_url || "",
                is_active: testimonial.is_active
            });
        } else {
            setEditingTestimonial(null);
            setFormData({
                name: "",
                role: "",
                content: "",
                rating: 5,
                image_url: "",
                is_active: true
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingTestimonial) {
                const { error } = await supabase
                    .from('testimonials')
                    .update(formData)
                    .eq('id', editingTestimonial.id);
                if (error) throw error;
                toast.success("Testimonial updated");
            } else {
                const { error } = await supabase
                    .from('testimonials')
                    .insert([formData]);
                if (error) throw error;
                toast.success("Testimonial created");
            }
            setIsDialogOpen(false);
            fetchTestimonials();
        } catch (error: any) {
            toast.error(error.message || "Operation failed");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this testimonial?")) return;
        try {
            const { error } = await supabase
                .from('testimonials')
                .delete()
                .eq('id', id);
            if (error) throw error;
            toast.success("Testimonial deleted");
            fetchTestimonials();
        } catch (error: any) {
            toast.error("Delete failed");
        }
    };

    const toggleActive = async (testimonial: any) => {
        try {
            const { error } = await supabase
                .from('testimonials')
                .update({ is_active: !testimonial.is_active })
                .eq('id', testimonial.id);
            if (error) throw error;
            fetchTestimonials();
        } catch (error: any) {
            toast.error("Toggle failed");
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <Quote className="size-8 text-emerald-600" />
                        Testimonials
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Manage user success stories and ratings for the landing page.</p>
                </div>
                <Button 
                    onClick={() => handleOpenDialog()} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl h-12 px-6 shadow-lg shadow-emerald-500/20 gap-2"
                >
                    <Plus className="size-5" /> Add Testimonial
                </Button>
            </div>

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="size-8 animate-spin text-emerald-600" />
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {testimonials.map((t) => (
                        <Card key={t.id} className="rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden bg-white dark:bg-slate-900 flex flex-col">
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <Star 
                                                key={i} 
                                                className={`size-3 ${i < t.rating ? "fill-emerald-500 text-emerald-500" : "text-slate-200"}`} 
                                            />
                                        ))}
                                    </div>
                                    <Badge 
                                        variant="outline" 
                                        onClick={() => toggleActive(t)}
                                        className={`cursor-pointer capitalize font-bold ${t.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}
                                    >
                                        {t.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 flex-1">
                                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium italic">"{t.content}"</p>
                                <div className="flex items-center gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                                    {t.image_url ? (
                                        <img src={t.image_url} alt="" className="size-10 rounded-full object-cover" />
                                    ) : (
                                        <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-xs">
                                            {t.name[0]}
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white text-sm">{t.name}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.role}</div>
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-4">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleOpenDialog(t)}
                                        className="flex-1 rounded-xl border-slate-200 dark:border-slate-800 font-bold text-xs h-9 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    >
                                        <Edit2 className="size-3 mr-2" /> Edit
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleDelete(t.id)}
                                        className="flex-1 rounded-xl border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 font-bold text-xs h-9"
                                    >
                                        <Trash2 className="size-3 mr-2" /> Delete
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white">
                            {editingTestimonial ? "Edit Testimonial" : "Add New Testimonial"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Name</Label>
                                <Input 
                                    required 
                                    className="rounded-xl h-11"
                                    value={formData.name} 
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Role</Label>
                                <Input 
                                    className="rounded-xl h-11"
                                    value={formData.role} 
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })} 
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Content</Label>
                            <textarea 
                                required 
                                className="w-full min-h-[100px] rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={formData.content} 
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })} 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Rating (1-5)</Label>
                                <Input 
                                    type="number" 
                                    min="1" 
                                    max="5" 
                                    className="rounded-xl h-11"
                                    value={formData.rating} 
                                    onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Image URL</Label>
                                <Input 
                                    placeholder="https://..." 
                                    className="rounded-xl h-11"
                                    value={formData.image_url} 
                                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} 
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="is_active" 
                                checked={formData.is_active} 
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} 
                            />
                            <Label htmlFor="is_active" className="text-sm font-bold text-slate-600 dark:text-slate-400">Published</Label>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold px-8">
                                {editingTestimonial ? "Update" : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
