
"use client";
import Link from "next/link";
import * as React from "react";
import { supabase } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, RefreshCw, Check, X, Calendar, History, FileSignature, User, LogOut, BookOpen, Loader2, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, differenceInCalendarDays, parseISO, isWithinInterval, addDays } from "date-fns";
import { id } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";


type ParentProfile = {
    full_name: string;
    email?: string;
};

type AcademicPeriod = {
    id: string;
    period_name: string;
    academic_year: string;
    start_date: string;
    end_date: string;
}

type LeaveRequest = {
    id: string;
    leave_type: 'Sakit' | 'Izin';
    start_date: string;
    end_date: string;
    reason: string | null;
    status: 'AKTIF' | 'SELESAI' | 'DIBATALKAN';
    document_url: string | null;
    students: {
        full_name: string;
    } | null;
};


type StudentData = {
    id: string;
    full_name: string;
    classes: {
        class_name: string;
    } | null;
    leave_requests: LeaveRequest[];
};

const getBadgeInfo = (activeLeave: StudentData['leave_requests'][0] | undefined) => {
    if (!activeLeave) return { text: "Tidak Ada Izin Aktif", className: "bg-green-100 text-green-800 border-green-200" };
    if (activeLeave.leave_type.toLowerCase() === 'sakit') return { text: "Sakit", className: "bg-red-100 text-red-800 border-red-200 capitalize" };
    if (activeLeave.leave_type.toLowerCase() === 'izin') return { text: "Izin", className: "bg-yellow-100 text-yellow-800 border-yellow-200 capitalize" };
    return { text: "Status Tidak Diketahui", className: "bg-gray-100 text-gray-800 border-gray-200" };
}

const extendFormSchema = z.object({
  duration: z.enum(["1", "2", "3"], { required_error: "Anda harus memilih durasi perpanjangan." }),
  reason: z.string().optional(),
});


export default function ParentDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = React.useState<ParentProfile | null>(null);
  const [students, setStudents] = React.useState<StudentData[]>([]);
  const [allAcademicPeriods, setAllAcademicPeriods] = React.useState<AcademicPeriod[]>([]);
  const [currentAcademicPeriod, setCurrentAcademicPeriod] = React.useState<AcademicPeriod | null>(null);
  const [selectedAcademicYear, setSelectedAcademicYear] = React.useState<string | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [leaveToCancel, setLeaveToCancel] = React.useState<LeaveRequest | null>(null);

  const [isCompleting, setIsCompleting] = React.useState(false);
  const [leaveToComplete, setLeaveToComplete] = React.useState<LeaveRequest | null>(null);

  const [isExtending, setIsExtending] = React.useState(false);
  const [leaveToExtend, setLeaveToExtend] = React.useState<LeaveRequest | null>(null);

  const form = useForm<z.infer<typeof extendFormSchema>>({
    resolver: zodResolver(extendFormSchema),
    defaultValues: {
      duration: "1",
      reason: "",
    },
  });
  
  const watchDuration = form.watch("duration");
  
  const newEndDate = React.useMemo(() => {
    if (!leaveToExtend || !watchDuration) return null;
    const currentEndDate = parseISO(leaveToExtend.end_date);
    const extensionDays = parseInt(watchDuration, 10);
    return addDays(currentEndDate, extensionDays);
  }, [leaveToExtend, watchDuration]);


  // Derived state for filtering dropdowns
  const availableYears = React.useMemo(() => {
    const years = new Set(allAcademicPeriods.map(p => p.academic_year));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [allAcademicPeriods]);
  
  const periodsForSelectedYear = React.useMemo(() => {
    if (!selectedAcademicYear) return [];
    return allAcademicPeriods.filter(p => p.academic_year === selectedAcademicYear);
  }, [allAcademicPeriods, selectedAcademicYear]);


  const fetchProfileAndData = React.useCallback(async () => {
    setLoading(true);
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
        await supabase.auth.signOut();
        router.replace("/?error=no_parent_profile");
        return;
    }
    setProfile({ ...parentProfile, email: user.email });

    const studentRelationsPromise = supabase
        .from('student_parents')
        .select('student_id')
        .eq('parent_profile_id', parentProfile.id);

    const academicPeriodsPromise = supabase
        .from('academic_periods')
        .select('*')
        .order('start_date', { ascending: false });

    const [{ data: studentRelations, error: relationsError }, { data: periodsData, error: periodsError }] = await Promise.all([
        studentRelationsPromise, 
        academicPeriodsPromise
    ]);

    if (relationsError) console.error("Error fetching student relations:", relationsError);
    if (periodsError) console.error("Error fetching academic periods:", periodsError);

    if (periodsData) {
        setAllAcademicPeriods(periodsData);
        const today = new Date();
        const activePeriod = periodsData.find(p => isWithinInterval(today, { start: parseISO(p.start_date), end: parseISO(p.end_date) })) || null;
        setCurrentAcademicPeriod(activePeriod);
        if (activePeriod) {
            setSelectedAcademicYear(activePeriod.academic_year);
            setSelectedPeriodId(activePeriod.id);
        } else if (periodsData.length > 0) {
             const latestPeriod = periodsData[0];
             setSelectedAcademicYear(latestPeriod.academic_year);
             setSelectedPeriodId(latestPeriod.id);
        }
    }

    if (studentRelations && studentRelations.length > 0) {
        const studentIds = studentRelations.map(r => r.student_id);
        const { data: studentData, error: studentsError } = await supabase
            .from('students')
            .select(`
                id,
                full_name,
                classes ( class_name ),
                leave_requests ( id, leave_type, start_date, end_date, reason, status, document_url, students ( full_name ) )
            `)
            .in('id', studentIds);
        
        if (studentData) setStudents(studentData as StudentData[]);
        if (studentsError) console.error("Error fetching student data:", studentsError);
    }
    
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);


  React.useEffect(() => {
    fetchProfileAndData();
  }, [fetchProfileAndData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const handleConfirmCancel = async () => {
    if (!leaveToCancel) return;
    
    setIsCancelling(true);

    try {
        if (leaveToCancel.document_url) {
            const pathSegments = leaveToCancel.document_url.split('/public/dokumen_izin/');
            const path = pathSegments.length > 1 ? decodeURIComponent(pathSegments[1]) : null;
            
            if (path) {
                const { error: storageError } = await supabase.storage.from('dokumen_izin').remove([path]);
                if (storageError) {
                    console.error("Failed to delete document, but continuing with cancellation:", storageError);
                    toast({
                        variant: "destructive",
                        title: "Gagal Menghapus Dokumen",
                        description: "Dokumen tidak dapat dihapus, namun izin tetap akan dibatalkan. Hubungi admin jika perlu."
                    });
                }
            }
        }

        const { error: dbError } = await supabase
            .from('leave_requests')
            .update({ status: 'DIBATALKAN' })
            .eq('id', leaveToCancel.id);

        if (dbError) throw dbError;

        toast({
            title: "Izin Dibatalkan",
            description: "Pemberitahuan izin telah berhasil dibatalkan."
        });

        await fetchProfileAndData();

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Gagal Membatalkan Izin",
            description: error.message || "Terjadi kesalahan pada server."
        });
    } finally {
        setIsCancelling(false);
        setLeaveToCancel(null);
    }
  };

  const handleConfirmComplete = async () => {
    if (!leaveToComplete) return;

    setIsCompleting(true);
    try {
      const today = new Date();
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'SELESAI', end_date: format(today, 'yyyy-MM-dd') })
        .eq('id', leaveToComplete.id);

      if (error) throw error;

      toast({
        title: 'Status Diperbarui',
        description: 'Status izin telah ditandai sebagai "Selesai".',
      });
      await fetchProfileAndData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal Memperbarui Status',
        description: error.message || 'Terjadi kesalahan pada server.',
      });
    } finally {
      setIsCompleting(false);
      setLeaveToComplete(null);
    }
  };

  const handleExtendSubmit = async (values: z.infer<typeof extendFormSchema>) => {
      if (!leaveToExtend || !newEndDate) return;
      setIsExtending(true);

      try {
          const newReason = `(Perpanjangan: ${values.reason || 'Tidak ada alasan tambahan'})`;
          const updatedReason = leaveToExtend.reason ? `${leaveToExtend.reason}\n${newReason}` : newReason;

          const { error } = await supabase
              .from('leave_requests')
              .update({ 
                  end_date: format(newEndDate, 'yyyy-MM-dd'),
                  reason: updatedReason 
              })
              .eq('id', leaveToExtend.id);
          
          if (error) throw error;

          toast({
              title: "Izin Diperpanjang",
              description: `Izin untuk ${leaveToExtend.students?.full_name} berhasil diperpanjang.`,
          });
          
          await fetchProfileAndData();
      } catch (error: any) {
          toast({
              variant: "destructive",
              title: "Gagal Memperpanjang Izin",
              description: error.message || "Terjadi kesalahan pada server.",
          });
      } finally {
          setIsExtending(false);
          setLeaveToExtend(null);
      }
  };
  
  const handleYearChange = (year: string) => {
    setSelectedAcademicYear(year);
    const firstPeriod = allAcademicPeriods.find(p => p.academic_year === year);
    if(firstPeriod) setSelectedPeriodId(firstPeriod.id);
  }

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
                 <Skeleton className="h-28 w-full rounded-xl" />
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
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-8">
        <Card className="shadow-sm">
            <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                    <BookOpen className="h-6 w-6 text-primary" />
                    <span>Periode Akademik</span>
                </CardTitle>
                 <CardDescription>
                    {currentAcademicPeriod ? (
                        <span>
                            Periode aktif saat ini adalah <strong>{currentAcademicPeriod.period_name}</strong> TA <strong>{currentAcademicPeriod.academic_year}</strong>.
                        </span>
                    ) : (
                        'Saat ini tidak ada periode akademik yang aktif.'
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                    <label htmlFor="academic-year" className="text-sm font-medium mb-2 block">Tahun Ajaran</label>
                    <Select onValueChange={handleYearChange} value={selectedAcademicYear || ''}>
                        <SelectTrigger id="academic-year">
                            <SelectValue placeholder="Pilih Tahun Ajaran" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableYears.map(year => (
                                <SelectItem key={year} value={year}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                     <label htmlFor="academic-period" className="text-sm font-medium mb-2 block">Periode</label>
                    <Select onValueChange={setSelectedPeriodId} value={selectedPeriodId || ''} disabled={!selectedAcademicYear}>
                        <SelectTrigger id="academic-period">
                            <SelectValue placeholder="Pilih Periode" />
                        </SelectTrigger>
                        <SelectContent>
                            {periodsForSelectedYear.map(period => (
                                <SelectItem key={period.id} value={period.id}>{period.period_name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => {
              const activeLeave = student.leave_requests.find(lr => lr.status === 'AKTIF');
              const badgeInfo = getBadgeInfo(activeLeave);
              
              const selectedPeriod = allAcademicPeriods.find(p => p.id === selectedPeriodId);
              
              const filteredRequests = selectedPeriod ? student.leave_requests.filter(lr => {
                  const leaveStartDate = parseISO(lr.start_date);
                  const periodInterval = { start: parseISO(selectedPeriod.start_date), end: parseISO(selectedPeriod.end_date) };
                  return isWithinInterval(leaveStartDate, periodInterval);
              }) : [];

              const sakitAttendance = filteredRequests.filter(lr => lr.leave_type === 'Sakit');
              const izinAttendance = filteredRequests.filter(lr => lr.leave_type === 'Izin');
              
              const totalSakitDays = sakitAttendance.reduce((acc, curr) => acc + differenceInCalendarDays(parseISO(curr.end_date), parseISO(curr.start_date)) + 1, 0);
              const totalIzinDays = izinAttendance.reduce((acc, curr) => acc + differenceInCalendarDays(parseISO(curr.end_date), parseISO(curr.start_date)) + 1, 0);

            return (
            <Card key={student.id} className="shadow-md rounded-xl flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b p-4">
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
              <CardContent className="space-y-4 flex-grow pt-4 pb-4 p-4">
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
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => setLeaveToExtend(activeLeave)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Perpanjang
                        </Button>
                        <Button size="sm" className="flex-1" onClick={() => setLeaveToComplete(activeLeave)}>
                            <Check className="mr-2 h-4 w-4" />
                            Sudah Masuk
                        </Button>
                        <Button variant="destructive" size="sm" className="flex-1" onClick={() => setLeaveToCancel(activeLeave)}>
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
         <AlertDialog open={!!leaveToCancel} onOpenChange={(open) => !open && setLeaveToCancel(null)}>
            <AlertDialogContent className="max-w-sm rounded-2xl">
                <AlertDialogHeader className="text-center items-center space-y-0">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10 mb-4">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <AlertDialogTitle className="text-lg">Batalkan Pengajuan Izin?</AlertDialogTitle>
                    <AlertDialogDescription className="pt-2">
                        <b>Izin ini</b> akan tercatat sebagai <b>&quot;Dibatalkan&quot;</b> di Riwayat. Dokumen Pendukung <b>izin ini</b> yang terunggah (jika ada) akan <b>dihapus dari sistem.</b>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-4">
                    <AlertDialogCancel onClick={() => setLeaveToCancel(null)} disabled={isCancelling}>
                        Jangan Batalkan
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmCancel} disabled={isCancelling} className="bg-destructive hover:bg-destructive/90">
                         {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Ya, Batalkan Izin
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!leaveToComplete} onOpenChange={(open) => !open && setLeaveToComplete(null)}>
            <AlertDialogContent className="max-w-sm rounded-2xl">
                <AlertDialogHeader className="text-center items-center">
                     <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10 mb-4">
                        <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <AlertDialogTitle className="text-lg">Konfirmasi Siswa Sudah Masuk?</AlertDialogTitle>
                    <AlertDialogDescription className="pt-2">
                        Aksi ini akan mengubah status izin dari <b>AKTIF</b> menjadi <b>SELESAI</b>. Tanggal akhir izin akan disesuaikan menjadi hari ini.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-4">
                    <AlertDialogCancel onClick={() => setLeaveToComplete(null)} disabled={isCompleting}>
                        Batal
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmComplete} disabled={isCompleting} className="bg-primary hover:bg-primary/90">
                        {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Ya, Konfirmasi Sudah Masuk
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Sheet open={!!leaveToExtend} onOpenChange={(open) => { if (!open) setLeaveToExtend(null); }}>
            <SheetContent className="flex flex-col">
                 <SheetHeader>
                    <SheetTitle>Perpanjang Izin</SheetTitle>
                    <SheetDescription>
                        Perpanjang izin untuk <strong>{leaveToExtend?.students?.full_name}</strong>. Pilih durasi perpanjangan dan berikan keterangan jika perlu.
                    </SheetDescription>
                </SheetHeader>
                
                <div className="py-4 flex-1 overflow-y-auto">
                    <Card className="mb-4">
                        <CardContent className="p-3 text-sm">
                            <p><strong>Izin Saat Ini:</strong> {leaveToExtend?.leave_type}</p>
                            <p><strong>Berlaku hingga:</strong> {leaveToExtend ? format(parseISO(leaveToExtend.end_date), "EEEE, d MMMM yyyy", { locale: id }) : '-'}</p>
                        </CardContent>
                    </Card>
                    <Form {...form}>
                        <form id="extend-form" onSubmit={form.handleSubmit(handleExtendSubmit)} className="space-y-6">
                             <FormField
                                control={form.control}
                                name="duration"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                    <FormLabel>Perpanjang Selama</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex items-center space-x-4"
                                        >
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="1" /></FormControl>
                                            <FormLabel className="font-normal">1 Hari</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="2" /></FormControl>
                                            <FormLabel className="font-normal">2 Hari</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="3" /></FormControl>
                                            <FormLabel className="font-normal">3 Hari</FormLabel>
                                        </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-2">
                                <Label>Tanggal Selesai Baru</Label>
                                <Input 
                                    readOnly 
                                    value={newEndDate ? format(newEndDate, "EEEE, d MMMM yyyy", { locale: id }) : "..."}
                                    className="bg-muted/50"
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="reason"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Alasan Perpanjangan (Opsional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                            placeholder="Contoh: Sesuai anjuran dokter, perlu istirahat tambahan."
                                            {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
                </div>

                <SheetFooter>
                    <SheetClose asChild>
                        <Button type="button" variant="outline" disabled={isExtending}>Batal</Button>
                    </SheetClose>
                    <Button type="submit" form="extend-form" disabled={isExtending}>
                        {isExtending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Kirim Perpanjangan
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
      </main>
    </div>
  );
}

