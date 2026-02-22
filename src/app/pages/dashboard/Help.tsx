import { Mail, Phone, MessageSquare, LifeBuoy, ExternalLink, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { PlanRecommender } from "@/app/components/PlanRecommender";

export function Help() {
    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <LifeBuoy className="size-8 text-emerald-600" />
                        Request Help
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Get assistance with your account or find the right saving plan.</p>
                </div>
            </div>

            <Tabs defaultValue="support" className="space-y-8">
                <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full sm:w-auto">
                    <TabsTrigger value="support" className="rounded-lg px-8 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-emerald-600 transition-all">
                        Support & Contact
                    </TabsTrigger>
                    <TabsTrigger value="finder" className="rounded-lg px-8 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-emerald-600 transition-all">
                        Plan Finder
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="support" className="space-y-6 outline-none">
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Support Channels */}
                        <div className="space-y-6">
                            <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                                <CardHeader>
                                    <CardTitle className="text-xl font-bold dark:text-white">Direct Support</CardTitle>
                                    <CardDescription>Speak directly with our dedicated team.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <ContactCard
                                        icon={<MessageSquare className="size-5" />}
                                        title="WhatsApp Chat"
                                        value="+234 801 234 5678"
                                        description="Real-time assistance, 24/7"
                                        color="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                                        onClick={() => window.open('https://wa.me/2348012345678', '_blank')}
                                    />
                                    <ContactCard
                                        icon={<Mail className="size-5" />}
                                        title="Email Support"
                                        value="support@ajosave.com"
                                        description="Response within 24 hours"
                                        color="text-blue-600 bg-blue-50 dark:bg-blue-900/20"
                                        onClick={() => window.open('mailto:support@ajosave.com')}
                                    />
                                    <ContactCard
                                        icon={<Phone className="size-5" />}
                                        title="Call Center"
                                        value="+234 801 234 5678"
                                        description="Mon-Fri, 9am - 5pm"
                                        color="text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                                    />
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-sm bg-emerald-600 text-white overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                <CardHeader>
                                    <CardTitle className="text-xl font-bold">Manual Circle Management</CardTitle>
                                    <CardDescription className="text-emerald-50/80">Need help creating or managing a circle manually?</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm font-medium leading-relaxed">
                                        Our experts can help you set up custom circles, manage member contributions offline, and provide escrow services for your group.
                                    </p>
                                    <Button variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white hover:text-emerald-700 font-bold rounded-xl" onClick={() => window.open('https://wa.me/2348012345678', '_blank')}>
                                        Speak to an Expert
                                        <ExternalLink className="ml-2 size-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Common Questions / Help Form Placeholder */}
                        <div className="space-y-6">
                            <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                                <CardHeader>
                                    <CardTitle className="text-xl font-bold dark:text-white">Quick Assistance</CardTitle>
                                    <CardDescription>Common things we can help you with.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 pb-8">
                                    <HelpItem title="Password & Security" description="I can't access my account or need to reset my 2FA." />
                                    <HelpItem title="Transaction Issues" description="A deposit isn't reflecting or withdrawal is pending." />
                                    <HelpItem title="Plan Rules" description="I need clarification on service charges or penalties." />
                                    <HelpItem title="KYC Verification" description="My ID documentation is still pending approval." />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="finder" className="outline-none flex justify-center">
                    <div className="w-full max-w-2xl">
                        <PlanRecommender inline />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function ContactCard({ icon, title, value, description, color, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-4 p-4 rounded-2xl border border-transparent hover:border-emerald-200 transition-all cursor-pointer bg-gray-50 dark:bg-gray-800/50 group`}
        >
            <div className={`size-12 rounded-xl flex items-center justify-center ${color}`}>
                {icon}
            </div>
            <div className="flex-1">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</h4>
                <p className="font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-xs text-gray-500 font-medium">{description}</p>
            </div>
        </div>
    );
}

function HelpItem({ title, description }: any) {
    return (
        <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-emerald-100 dark:hover:border-emerald-900/30 transition-colors bg-white dark:bg-black/10">
            <h4 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                <HelpCircle className="size-4 text-emerald-500" />
                {title}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        </div>
    );
}
