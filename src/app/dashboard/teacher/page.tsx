
"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, School, ClipboardList } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TeacherProfile = {
    id: string;
    full_name: string;
    email?: string;
};

type HomeroomClass = {
    id: string;
    class_name: string;
} | null;

type LeaveRequest = {
    id: string;
    start_date: string;
    end_date: string;
    leave_type: string;
    status: string;
    students: {
        full_name: string;
    } | null;
}

export default function TeacherDashboardPage() {
    const router = useRouter();
    const [profile, setProfile] = React.useState<TeacherProfile | null>(null);
    const [homeroomClass, setHomeroomClass] = React.useState<HomeroomClass>(null);
    const [leaveRequests, setLeaveRequests] = React.useState<LeaveRequest[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        async function fetchProfileAndData() {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace("/");
                return;
            }

            const { data: teacherProfile, error: profileError } = await supabase
                .from('teacher_profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (profileError || !teacherProfile) {
                console.error("Not a teacher or error fetching profile, redirecting...");
                router.replace("/dashboard");
                return;
            }
            
            setProfile({ ...teacherProfile, email: user.email });

            // Check if this teacher is a homeroom teacher
            const { data: hrClass, error: hrError } = await supabase
                .from('classes')
                .select('*')
                .eq('homeroom_teacher_id', teacherProfile.id)
                .single();
            
            if (hrClass) {
                setHomeroomClass(hrClass);

                // Fetch students in this class
                const { data: students, error: studentsError } = await supabase
                    .from('students')
                    .select('id')
                    .eq('class_id', hrClass.id);

                if (students && students.length > 0) {
                    const studentIds = students.map(s => s.id);
                    
                    // Fetch leave requests for students in this class
                    const { data: requests, error: requestsError } = await supabase
                        .from('leave_requests')
                        .select(`
                            id,
                            start_date,
                            end_date,
                            leave_type,
                            status,
                            students (
                                full_name
                            )
                        `)
                        .in('student_id', studentIds)
                        .order('start_date', { ascending: false });

                    if (requests) {
                        setLeaveRequests(requests as LeaveRequest[]);
                    }
                }
            }
            
            setLoading(false);
        }

        fetchProfileAndData();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace("/");
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Memuat dasbor guru...</div>;
    }
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/10">
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-14 sm:h-16">
                        <div className="flex items-center">
                             <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-3">
                                <ClipboardList className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <div>
                                <h1 className="text-base sm:text-lg font-semibold text-gray-900">Dasbor Guru</h1>
                                <p className="text-xs sm:text-sm text-gray-600">{profile?.full_name}</p>
                            </div>
                        </div>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={`https://i.pravatar.cc/150?u=${profile?.id}`} alt={profile?.full_name || "T"} />
                                        <AvatarFallback>{profile?.full_name?.charAt(0) || "T"}</AvatarFallback>
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
                {homeroomClass ? (
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <School className="w-6 h-6 text-primary"/>
                                <span>Wali Kelas - {homeroomClass.class_name}</span>
                            </CardTitle>
                            <CardDescription>Daftar pengajuan izin terbaru dari siswa di kelas Anda.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           {leaveRequests.length > 0 ? (
                                <div className="space-y-4">
                                    {leaveRequests.map(req => (
                                        <div key={req.id} className="p-4 border rounded-lg flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">{req.students?.full_name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {req.leave_type} - {new Date(req.start_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long'})} s/d {new Date(req.end_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}
                                                </p>
                                            </div>
                                            <Badge variant={req.status === 'AKTIF' ? 'destructive' : 'default'}>{req.status}</Badge>
                                        </div>
                                    ))}
                                </div>
                           ) : (
                                <p className="text-center text-muted-foreground py-8">Belum ada pengajuan izin di kelas ini.</p>
                           )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="text-center py-16">
                        <h2 className="text-2xl font-bold">Selamat Datang, Bapak/Ibu Guru!</h2>
                        <p className="text-muted-foreground mt-2">Anda login sebagai guru mata pelajaran. Fitur spesifik untuk Anda akan segera hadir.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
