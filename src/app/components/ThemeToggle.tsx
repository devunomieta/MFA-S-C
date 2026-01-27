import { Moon, Sun } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { useTheme } from "@/app/context/ThemeContext";
import { toast } from "sonner"; // Assuming sonner is used as seen in other files

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    const toggleTheme = () => {
        // Check if the current resolved theme is dark
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = theme === 'dark' || (theme === 'system' && isSystemDark);

        // Explicitly set the opposite
        const newTheme = isDark ? "light" : "dark";
        setTheme(newTheme);

        toast.success(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode`);

        // Debug
        console.log(`Toggling Theme: Current=${theme} (Resolved Dark=${isDark}) -> New=${newTheme}`);
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-gray-700 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400"
            title={`Current theme: ${theme}`}
        >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
