import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useAuth } from "@/app/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { toast } from "sonner";


export function AdminProfile() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState({
        full_name: "",
        email: "",
        avatar_url: ""
    });

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user]);

    async function fetchProfile() {
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user?.id)
            .single();

        if (data) {
            setProfile({
                full_name: data.full_name || "",
                email: data.email || user?.email || "",
                avatar_url: data.avatar_url || ""
            });
        }
    }

    async function updateProfile() {
        if (!profile.full_name.trim()) {
            toast.error("Full Name cannot be empty");
            return;
        }

        setLoading(true);
        const { error } = await supabase
            .from("profiles")
            .update({
                full_name: profile.full_name,
                // avatar_url: profile.avatar_url // TODO: Handle avatar upload
            })
            .eq("id", user?.id);

        if (error) {
            toast.error("Failed to update profile");
        } else {
            toast.success("Profile updated successfully");
            // Update Auth Session Metadata if needed?
            // supabase.auth.updateUser({ data: { full_name: profile.full_name } })
        }
        setLoading(false);
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
                <p className="text-slate-500">Manage your admin account details.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your public profile details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={profile.avatar_url} />
                            <AvatarFallback className="text-xl bg-slate-100 text-slate-700">
                                {(profile.full_name?.[0] || 'A').toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        {/* Avatar upload placeholder */}
                        <Button variant="outline" disabled>Change Avatar</Button>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
                            value={profile.full_name}
                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            value={profile.email}
                            disabled
                            className="bg-slate-50 text-slate-500"
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={updateProfile} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Security</CardTitle>
                    <CardDescription>Manage your password.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline">Change Password</Button>
                </CardContent>
            </Card>
        </div>
    );
}
