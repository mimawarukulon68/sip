
"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Settings, Users, School } from "lucide-react";

type AdminProfile = {
    full_name: string;
    email?: string;
};

export default function AdminDashboardPage() {
    const router = useRouter();
    const [profile, setProfile] = React.useState<AdminProfile | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        async function fetchProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace("/");
                return;
            }

            const { data: adminProfile, error } = await supabase
                .from('admin_profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error || !adminProfile) {
                console.error("Not an admin or error fetching profile, redirecting...");
                router.replace("/dashboard"); // Redirect to the main dashboard router
                return;
            }
            
            setProfile({ ...adminProfile, email: user.email });
            setLoading(false);
        }

        fetchProfile();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace("/");
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Memuat dasbor admin...</div>;
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/10">
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-14 sm:h-16">
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-3">
                                <Settings className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <div>
                                <h1 className="text-base sm:text-lg font-semibold text-gray-900">Dasbor Admin</h1>
                                <p className="text-xs sm:text-sm text-gray-600">Manajemen Sistem Perizinan</p>
                            </div>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={`https://i.pravatar.cc/150?u=admin`} alt={profile?.full_name || "A"} />
                                        <AvatarFallback>{profile?.full_name?.charAt(0) || "A"}</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
                                        <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Profil</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Keluar</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>
            <main className="flex-1 p-4 md:p-8">
                <h2 className="text-2xl font-bold tracking-tight mb-6">Panel Manajemen Utama</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div className="p-6 bg-card rounded-lg shadow">
                        <Users className="h-8 w-8 text-primary mb-4" />
                        <h3 className="text-lg font-semibold">Manajemen Pengguna</h3>
                        <p className="text-sm text-muted-foreground mt-2">Kelola akun guru, orang tua, dan siswa.</p>
                    </div>
                     <div className="p-6 bg-card rounded-lg shadow">
                        <School className="h-8 w-8 text-primary mb-4" />
                        <h3 className="text-lg font-semibold">Manajemen Kelas</h3>
                        <p className="text-sm text-muted-foreground mt-2">Buat, edit, dan kelola data kelas dan wali kelas.</p>
                    </div>
                     <div className="p-6 bg-card rounded-lg shadow">
                        <Settings className="h-8 w-8 text-primary mb-4" />
                        <h3 className="text-lg font-semibold">Pengaturan Sistem</h3>
                        <p className="text-sm text-muted-foreground mt-2">Atur periode akademik dan konfigurasi lainnya.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
