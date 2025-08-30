
"use client";
import Link from "next/link";
import * as React from "react";
import { supabase } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, RefreshCw, Check, X, Calendar, History, FileSignature, User, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";


type ParentProfile = {
    full_name: string;
    email?: string;
};

type StudentData = {
    id: string;
    full_name: string;
    classes: {
        class_name: string;
    } | null;
    leave_requests: {
        id: string;
        leave_type: 'Sakit' | 'Izin';
        start_date: string;
        end_date: string;
        reason: string | null;
        status: 'AKTIF' | 'SELESAI' | 'DIBATALKAN';
    }[];
};

const getBadgeInfo = (activeLeave: StudentData['leave_requests'][0] | undefined) => {
    if (!activeLeave) return { text: "Tidak Ada Izin Aktif", className: "bg-green-100 text-green-800 border-green-200" };
    if (activeLeave.leave_type.toLowerCase() === 'sakit') return { text: "Sakit", className: "bg-red-100 text-red-800 border-red-200 capitalize" };
    if (activeLeave.leave_type.toLowerCase() === 'izin') return { text: "Izin", className: "bg-yellow-100 text-yellow-800 border-yellow-200 capitalize" };
    return { text: "Status Tidak Diketahui", className: "bg-gray-100 text-gray-800 border-gray-200" };
}


export default function ParentDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = React.useState<ParentProfile | null>(null);
  const [students, setStudents] = React.useState<StudentData[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchProfileAndStudents() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.replace("/");
            return;
        }

        const { data: parentProfile, error: profileError } = await supabase
            .from('parent_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
        
        if (profileError || !parentProfile) {
            console.error("Not a parent or error fetching profile, redirecting...");
            router.replace("/dashboard");
            return;
        }

        setProfile({ ...parentProfile, email: user.email });

        // Fetch students related to this parent
        const { data: studentRelations, error: relationsError } = await supabase
            .from('student_parents')
            .select('student_id')
            .eq('parent_profile_id', parentProfile.id);

        if (relationsError) {
            console.error("Error fetching student relations:", relationsError);
            setLoading(false);
            return;
        }

        const studentIds = studentRelations.map(r => r.student_id);

        if (studentIds.length > 0) {
            const { data: studentData, error: studentsError } = await supabase
                .from('students')
                .select(`
                    id,
                    full_name,
                    classes (
                        class_name
                    ),
                    leave_requests (
                        id,
                        leave_type,
                        start_date,
                        end_date,
                        reason,
                        status
                    )
                `)
                .in('id', studentIds);
            
            if (studentData) {
                setStudents(studentData as StudentData[]);
            }
        }
        setLoading(false);
    }

    fetchProfileAndStudents();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };
  
  if (loading) {
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/10">
            <header className="bg-white shadow-sm border-b">
                 <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-14 sm:h-16">
                        <div className="flex items-center gap-3">
                             <Skeleton className="h-8 w-8 rounded-full" />
                             <Skeleton className="h-6 w-48" />
                        </div>
                        <Skeleton className="h-10 w-10 rounded-full" />
                    </div>
                </div>
            </header>
            <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
                 <div className="mb-4">
                    <Skeleton className="h-8 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2].map(i => (
                        <Card key={i} className="shadow-md rounded-xl flex flex-col">
                            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div>
                                        <Skeleton className="h-5 w-40 mb-1" />
                                        <Skeleton className="h-4 w-20" />
                                    </div>
                                </div>
                            </CardHeader>
                            <div className="p-4 pt-4 pb-0">
                               <Skeleton className="h-6 w-full" />
                            </div>
                            <CardContent className="flex-grow pt-4 pb-4">
                                <Skeleton className="h-32 w-full" />
                            </CardContent>
                            <CardFooter className="flex flex-col items-stretch gap-2 bg-slate-50 p-4 border-t">
                               <Skeleton className="h-9 w-full" />
                               <Skeleton className="h-9 w-full" />
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </main>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/10">
       <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-14 sm:h-16">
                <div className="flex items-center">
                    <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center mr-2">
                        <FileSignature className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-base sm:text-lg font-semibold text-gray-900">Sistem Perizinan Siswa</h1>
                        <p className="text-xs sm:text-sm text-gray-600">Dashboard Orang Tua/Wali Murid</p>
                    </div>
                </div>
                 <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                       <Avatar className="h-10 w-10">
                         <AvatarImage src={`https://i.pravatar.cc/150?u=${profile?.full_name}`} alt={profile?.full_name || "W"} />
                         <AvatarFallback>{profile?.full_name?.charAt(0) || "W"}</AvatarFallback>
                       </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {profile?.email}
                        </p>
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
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight">
            Selamat Datang Bapak/Ibu Wali Murid
          </h1>
          <p className="text-muted-foreground">
            Kelola perizinan dan pantau ringkasan absensi putra/putri Anda di sini.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => {
              const activeLeave = student.leave_requests.find(lr => lr.status === 'AKTIF');
              const badgeInfo = getBadgeInfo(activeLeave);
              const sakitAttendance = student.leave_requests.filter(lr => lr.leave_type === 'Sakit');
              const izinAttendance = student.leave_requests.filter(lr => lr.leave_type === 'Izin');
              
              const totalSakitDays = sakitAttendance.reduce((acc, curr) => acc + differenceInCalendarDays(parseISO(curr.end_date), parseISO(curr.start_date)) + 1, 0);
              const totalIzinDays = izinAttendance.reduce((acc, curr) => acc + differenceInCalendarDays(parseISO(curr.end_date), parseISO(curr.start_date)) + 1, 0);

            return (
            <Card key={student.id} className="shadow-md rounded-xl flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                 <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={`https://i.pravatar.cc/150?u=${student.id}`} alt={student.full_name} />
                    <AvatarFallback>{student.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{student.full_name}</CardTitle>
                    <CardDescription>{student.classes?.class_name || 'Belum ada kelas'}</CardDescription>
                  </div>
                </div>
              </CardHeader>
               <div className="p-4 pt-4 pb-0">
                  <Badge variant="outline" className={`w-full justify-center ${badgeInfo.className}`}>
                        {badgeInfo.text}
                  </Badge>
                  {activeLeave && (
                     <div className="mt-3 text-center text-xs text-muted-foreground p-2 bg-slate-50 rounded-md">
                        <p className="font-semibold text-slate-800">
                           {format(parseISO(activeLeave.start_date), "d MMMM", { locale: id })} - {format(parseISO(activeLeave.end_date), "d MMMM yyyy", { locale: id })} 
                           <span className="font-normal"> ({differenceInCalendarDays(parseISO(activeLeave.end_date), parseISO(activeLeave.start_date)) + 1} hari)</span>
                        </p>
                        {activeLeave.reason && (
                            <p className="mt-1 italic">
                                "{activeLeave.reason}"
                            </p>
                        )}
                     </div>
                  )}
                </div>
              <CardContent className="space-y-4 flex-grow pt-4 pb-4">
                 <div className="border bg-slate-50/50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                      <FileSignature className="h-4 w-4 text-gray-600"/>
                      Ringkasan Perizinan Siswa
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-3">
                            <div className="bg-red-50 rounded-lg p-3">
                                <div className="text-xs text-red-600">Sakit</div>
                                <div className="text-sm font-semibold text-red-700">{sakitAttendance.length} kali ({totalSakitDays} hari)</div>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-3">
                                <div className="text-xs text-yellow-600">Izin</div>
                                <div className="text-sm font-semibold text-yellow-700">{izinAttendance.length} kali ({totalIzinDays} hari)</div>
                            </div>
                        </div>
                         <div className="bg-slate-100 rounded-lg p-3 flex flex-col justify-center items-center text-center">
                            <div className="text-xs text-slate-600">Total Izin</div>
                            <div className="text-lg font-bold text-slate-900">{sakitAttendance.length + izinAttendance.length} kali</div>
                            <div className="text-sm text-slate-800">({totalSakitDays + totalIzinDays} hari)</div>
                        </div>
                    </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col items-stretch gap-2 bg-slate-50 p-4 border-t">
                 <div className="flex gap-2 flex-wrap">
                    {activeLeave ? (
                     <>
                        <Button variant="outline" size="sm" className="flex-1">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Perpanjang
                        </Button>
                        <Button size="sm" className="flex-1">
                        <Check className="mr-2 h-4 w-4" />
                        Sudah Masuk
                        </Button>
                        <Button variant="destructive" size="sm" className="flex-1">
                        <X className="mr-2 h-4 w-4" />
                        Batalkan
                        </Button>
                    </>
                    ) : (
                    <>
                        <Link href={`/dashboard/izin?studentId=${student.id}`} className="flex-1">
                            <Button size="sm" className="w-full">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Ajukan Izin
                            </Button>
                        </Link>
                         <Button variant="outline" size="sm" className="flex-1">
                            <Calendar className="mr-2 h-4 w-4" />
                            Izin Susulan
                        </Button>
                    </>
                    )}
                </div>
                 <Button variant="outline" size="sm" className="w-full">
                    <History className="mr-2 h-4 w-4" />
                    Lihat Riwayat
                </Button>
              </CardFooter>
            </Card>
          )})}
        </div>
      </main>
    </div>
  );
}

