import React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Breadcrumb {
    label: string;
    href?: string;
}

interface AdminPageHeaderProps {
    title: string;
    description?: string;
    breadcrumbs?: Breadcrumb[];
    actions?: React.ReactNode;
    className?: string;
}

export function AdminPageHeader({
    title,
    description,
    breadcrumbs,
    actions,
    className
}: AdminPageHeaderProps) {
    return (
        <div className={cn("mb-8 space-y-4", className)}>
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-2 text-xs font-medium text-slate-400">
                    <Link to="/admin" className="hover:text-emerald-600 transition-colors">Admin</Link>
                    {breadcrumbs.map((crumb, i) => (
                        <React.Fragment key={i}>
                            <ChevronRight className="w-3 h-3" />
                            {crumb.href ? (
                                <Link to={crumb.href} className="hover:text-emerald-600 transition-colors">
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span className="text-slate-600 font-semibold">{crumb.label}</span>
                            )}
                        </React.Fragment>
                    ))}
                </nav>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 leading-none">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-sm md:text-base text-slate-500 font-medium">
                            {description}
                        </p>
                    )}
                </div>
                {actions && (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
                        {actions}
                    </div>
                )}
            </div>
            <div className="h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent w-full" />
        </div>
    );
}
