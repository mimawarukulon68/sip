
"use client";
import Link from "next/link";
import * as React from "react";
import { supabase } from "@/lib/supabase-client";
import { useRouter, useSearchParams } from "next/navigation";
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
import { PlusCircle, RefreshCw, Check, X, Calendar, History, FileSignature, User, LogOut, CalendarRange, Loader2, AlertTriangle, Thermometer, FileText, Archive, ArchiveX, ClipboardList } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, differenceInCalendarDays, parseISO, isWithinInterval, addDays, isPast, isToday } from "date-fns";
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
    status: 'AKTIF' | 'SELESAI';
    document_url: string | null;
    students: {
        full_name: string;
    } | null;
    parent_leave_id: string | null;
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
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [profile, setProfile] = React.useState<ParentProfile | null>(null);
  const [students, setStudents] = React.useState<StudentData[]>([]);
  const [allAcademicPeriods, setAllAcademicPeriods] = React.useState<AcademicPeriod[]>([]);
  const [currentAcademicPeriod, setCurrentAcademicPeriod] = React.useState<AcademicPeriod | null>(null);
  const [selectedAcademicYear, setSelectedAcademicYear] = React.useState<string | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [leaveToDelete, setLeaveToDelete] = React.useState<{request: LeaveRequest, isExtension: boolean} | null>(null);

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
    const newStartDate = addDays(parseISO(leaveToExtend.end_date), 1);
    const extensionDays = parseInt(watchDuration, 10);
    return addDays(newStartDate, extensionDays - 1);
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
                leave_requests ( id, leave_type, start_date, end_date, reason, status, document_url, students ( full_name ), parent_leave_id )
            `)
            .in('id', studentIds);
        
        if (studentsError) {
          console.error("Error fetching student data:", studentsError);
           setLoading(false);
          return;
        } 
        
        if (studentData) {
            let dataNeedsRefresh = false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const updatePromises = studentData.flatMap(student => 
                student.leave_requests
                    .filter(lr => lr.status === 'AKTIF' && isPast(addDays(parseISO(lr.end_date), 1)))
                    .map(lr => {
                        dataNeedsRefresh = true;
                        console.log(`Updating expired leave request ${lr.id} for student ${student.full_name}`);
                        return supabase.from('leave_requests').update({ status: 'SELESAI' }).eq('id', lr.id);
                    })
            );

            if (dataNeedsRefresh) {
                await Promise.all(updatePromises);
                const { data: refreshedStudentData, error: refreshedError } = await supabase
                    .from('students')
                    .select(`id, full_name, classes ( class_name ), leave_requests ( id, leave_type, start_date, end_date, reason, status, document_url, students ( full_name ), parent_leave_id )`)
                    .in('id', studentIds);
                
                if (refreshedError) console.error("Error refetching student data:", refreshedError);
                setStudents((refreshedStudentData as StudentData[]) || []);
            } else {
                setStudents(studentData as StudentData[]);
            }
        }
    }
    
    setLoading(false);
  }, [router]);


  React.useEffect(() => {
    fetchProfileAndData();
  }, [fetchProfileAndData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const handleConfirmDelete = async () => {
    if (!leaveToDelete) return;
    
    setIsDeleting(true);

    try {
        if (leaveToDelete.request.document_url) {
            const pathSegments = leaveToDelete.request.document_url.split('/public/dokumen_izin/');
            const path = pathSegments.length > 1 ? decodeURIComponent(pathSegments[1]) : null;
            
            if (path) {
                const { error: storageError } = await supabase.storage.from('dokumen_izin').remove([path]);
                if (storageError) {
                    console.error("Failed to delete document, but continuing with deletion:", storageError);
                    toast({
                        variant: "destructive",
                        title: "Gagal Menghapus Dokumen",
                        description: "Dokumen tidak dapat dihapus, namun izin tetap akan dihapus. Hubungi admin jika perlu."
                    });
                }
            }
        }

        const { error: dbError } = await supabase
            .from('leave_requests')
            .delete()
            .eq('id', leaveToDelete.request.id);

        if (dbError) throw dbError;

        toast({
            title: "Izin Dihapus",
            description: "Pemberitahuan izin telah berhasil dihapus secara permanen."
        });

        await fetchProfileAndData();

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Gagal Menghapus Izin",
            description: error.message || "Terjadi kesalahan pada server."
        });
    } finally {
        setIsDeleting(false);
        setLeaveToDelete(null);
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Anda harus login untuk melakukan aksi ini." });
        setIsExtending(false);
        return;
    }
    
    const student = students.find(s => s.leave_requests.some(lr => lr.id === leaveToExtend.id));
    if (!student) {
         toast({ variant: "destructive", title: "Error", description: "Siswa tidak ditemukan." });
         setIsExtending(false);
         return;
    }

    try {
        const newStartDate = addDays(parseISO(leaveToExtend.end_date), 1);
        
        const { error } = await supabase.from('leave_requests').insert({
            created_by_user_id: user.id,
            student_id: student.id,
            leave_type: leaveToExtend.leave_type,
            start_date: format(newStartDate, 'yyyy-MM-dd'),
            end_date: format(newEndDate, 'yyyy-MM-dd'),
            reason: values.reason || null,
            status: 'AKTIF',
            parent_leave_id: leaveToExtend.id,
        });
        
        if (error) throw error;

        toast({
            title: "Izin Berhasil Diperpanjang",
            description: `Izin untuk ${student.full_name} telah diperpanjang.`,
        });
        
        setLeaveToExtend(null);
        form.reset();
        await fetchProfileAndData();

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Gagal Memperpanjang Izin",
            description: error.message || "Terjadi kesalahan pada server.",
        });
    } finally {
        setIsExtending(false);
    }
  };
  
  const handleYearChange = (year: string) => {
    setSelectedAcademicYear(year);
    const firstPeriod = allAcademicPeriods.find(p => p.academic_year === year);
    if(firstPeriod) setSelectedPeriodId(firstPeriod.id);
  }

  const findLastLeaveInChain = (leave: LeaveRequest, allStudentRequests: LeaveRequest[]): LeaveRequest => {
      let currentLeave = leave;
      // eslint-disable-next-line no-constant-condition
      while (true) {
          const nextLeave = allStudentRequests.find(lr => lr.parent_leave_id === currentLeave.id);
          if (nextLeave) {
              currentLeave = nextLeave;
          } else {
              break;
          }
      }
      return currentLeave;
  };

  if (loading && !leaveToExtend) {
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
                    <CalendarRange className="h-6 w-6 text-primary" />
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
            <CardContent className="p-4 pt-0 flex gap-2">
                <div style={{width: '45%'}}>
                    <Label htmlFor="academic-year" className="text-sm font-medium mb-2 block">Tahun Ajaran</Label>
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
                <div style={{width: '55%'}}>
                     <Label htmlFor="academic-period" className="text-sm font-medium mb-2 block">Periode</Label>
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
              const activeLeaves = student.leave_requests.filter(lr => lr.status === 'AKTIF');
              const activeLeaveRoots = activeLeaves.filter(lr => !lr.parent_leave_id);

              let finalActiveLeave: LeaveRequest | undefined = undefined;
              let fullLeaveChain: LeaveRequest[] = [];
              let combinedStartDate: string | undefined;
              
              if(activeLeaveRoots.length > 0) {
                  const root = activeLeaveRoots[0]; // assume only one active chain
                  const lastLeaveInChain = findLastLeaveInChain(root, student.leave_requests);
                  finalActiveLeave = lastLeaveInChain;
                  
                  let current = lastLeaveInChain;
                  fullLeaveChain.unshift(current);
                  while(current.parent_leave_id){
                      const parent = student.leave_requests.find(lr => lr.id === current.parent_leave_id);
                      if(parent){
                          fullLeaveChain.unshift(parent);
                          current = parent;
                      } else {
                          break;
                      }
                  }
                  combinedStartDate = fullLeaveChain[0].start_date;
              }


              const badgeInfo = getBadgeInfo(finalActiveLeave);
              const isExtended = fullLeaveChain.length > 1;
              
              const selectedPeriod = allAcademicPeriods.find(p => p.id === selectedPeriodId);
              
              const filteredRequests = selectedPeriod ? student.leave_requests.filter(lr => {
                  const leaveStartDate = parseISO(lr.start_date);
                  const periodInterval = { start: parseISO(selectedPeriod.start_date), end: parseISO(selectedPeriod.end_date) };
                  return isWithinInterval(leaveStartDate, periodInterval);
              }) : [];
              
              const validRequests = filteredRequests.filter(lr => lr.status === 'AKTIF' || lr.status === 'SELESAI');

              const sakitAttendance = validRequests.filter(lr => lr.leave_type === 'Sakit');
              const izinAttendance = validRequests.filter(lr => lr.leave_type === 'Izin');
              
              const totalSakitDays = sakitAttendance.reduce((acc, curr) => acc + differenceInCalendarDays(parseISO(curr.end_date), parseISO(curr.start_date)) + 1, 0);
              const totalIzinDays = izinAttendance.reduce((acc, curr) => acc + differenceInCalendarDays(parseISO(curr.end_date), parseISO(curr.start_date)) + 1, 0);
              const totalValidDays = totalSakitDays + totalIzinDays;
              
              const finalEndDate = finalActiveLeave ? parseISO(finalActiveLeave.end_date) : null;
              const totalDuration = finalActiveLeave && combinedStartDate ? differenceInCalendarDays(finalEndDate!, parseISO(combinedStartDate)) + 1 : 0;
              const isSingleDayLeave = totalDuration === 1;

              const canExtend = finalActiveLeave ? isToday(parseISO(finalActiveLeave.end_date)) : false;

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
                   {finalActiveLeave && combinedStartDate && !isExtended && (
                      <div className="mt-3 text-center text-xs text-muted-foreground p-2 bg-slate-50 rounded-md">
                          {isSingleDayLeave ? (
                              <>
                                  <div className="font-normal text-slate-800 flex justify-center items-center gap-1">
                                      {format(parseISO(combinedStartDate), "EEEE", { locale: id })}
                                      <span className="font-normal">({totalDuration} hari)</span>
                                  </div>
                                  <div className="font-semibold text-slate-800 flex justify-center items-center gap-2">
                                       {format(parseISO(combinedStartDate), "d MMM yyyy", { locale: id })}
                                  </div>
                              </>
                          ) : (
                              <>
                                  <div className="font-normal text-slate-800 flex justify-center items-center gap-1">
                                      {format(parseISO(combinedStartDate), "EEEE", { locale: id })} - {format(parseISO(finalActiveLeave.end_date), "EEEE", { locale: id })}
                                      <span className="font-normal">({totalDuration} hari)</span>
                                  </div>
                                  <div className="font-semibold text-slate-800 flex justify-center items-center gap-2">
                                      {format(parseISO(combinedStartDate), "d MMM", { locale: id })} - {format(parseISO(finalActiveLeave.end_date), "d MMM yyyy", { locale: id })}
                                  </div>
                              </>
                          )}
                          <p className="mt-1 italic">
                              "{finalActiveLeave.reason || 'Tidak ada alasan'}"
                          </p>
                      </div>
                  )}
                  {finalActiveLeave && combinedStartDate && isExtended && (
                       <div className="mt-3 text-center text-xs text-muted-foreground p-2 bg-slate-50 rounded-md">
                          <div className="font-normal text-slate-800 flex justify-center items-center gap-1">
                                {format(parseISO(combinedStartDate), "EEEE", { locale: id })} - {format(parseISO(finalActiveLeave.end_date), "EEEE", { locale: id })}
                                <span className="font-normal">({totalDuration} hari)</span>
                          </div>
                          <div className="font-semibold text-slate-800 flex justify-center items-center gap-2">
                              {format(parseISO(combinedStartDate), "d MMM", { locale: id })} - {format(parseISO(finalActiveLeave.end_date), "d MMM yyyy", { locale: id })}
                          </div>
                           <div className="mt-2 text-left bg-gray-100 rounded-lg p-3 space-y-2 text-xs text-gray-700 border">
                               {fullLeaveChain.map((request, index) => {
                                   const duration = differenceInCalendarDays(parseISO(request.end_date), parseISO(request.start_date)) + 1;
                                   const isFirst = index === 0;
                                   const isSakit = request.leave_type === 'Sakit';
                                   return (
                                       <div key={request.id} className="flex items-start gap-3">
                                           <div className="w-5 pt-0.5">
                                               {isFirst ? (
                                                    <FileSignature className="h-4 w-4 text-gray-600" />
                                                ) : (
                                                    <RefreshCw className="h-4 w-4 text-amber-600" />
                                                )}
                                           </div>
                                           <div className="flex-1">
                                               <p className="font-semibold">{index > 0 ? `Perpanjangan ${index}` : 'Awal'}</p>
                                               <p className="italic">
                                                   "{request.reason || "Tidak ada alasan"}"
                                               </p>
                                           </div>
                                           <Badge variant="outline" className="font-normal">{duration} hari</Badge>
                                       </div>
                                   )
                               })}
                           </div>
                       </div>
                  )}
                </div>
              <CardContent className="space-y-4 flex-grow pt-4 pb-4 p-4">
                 <div className="border bg-slate-50/50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                      <FileSignature className="h-4 w-4 text-gray-600"/>
                      Ringkasan Perizinan Siswa
                    </h4>
                    <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-3">
                                <div className="bg-red-50 rounded-lg p-3">
                                    <div className="flex items-center text-xs text-red-600 gap-2">
                                        <Thermometer className="h-4 w-4" />
                                        <span>Sakit</span>
                                    </div>
                                    <div className="text-sm font-semibold text-red-700 mt-1">{sakitAttendance.length} kali ({totalSakitDays} hari)</div>
                                </div>
                                <div className="bg-yellow-50 rounded-lg p-3">
                                    <div className="flex items-center text-xs text-yellow-600 gap-2">
                                        <FileText className="h-4 w-4" />
                                        <span>Izin</span>
                                    </div>
                                    <div className="text-sm font-semibold text-yellow-700 mt-1">{izinAttendance.length} kali ({totalIzinDays} hari)</div>
                                </div>
                            </div>
                            <div className="bg-slate-200 rounded-lg p-3 flex flex-col justify-center items-center text-center">
                                <div className="flex items-center text-xs text-slate-600 gap-2">
                                    <Archive className="h-4 w-4" />
                                    <span>Total Izin</span>
                                </div>
                                <div className="text-lg font-bold text-slate-900 mt-1">{validRequests.length} kali</div>
                                <div className="text-sm text-slate-800">({totalValidDays} hari)</div>
                            </div>
                        </div>
                    </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col items-stretch gap-2 bg-slate-50 p-4 border-t">
                 <div className="flex gap-2 flex-wrap">
                    {finalActiveLeave ? (
                     <>
                        {canExtend && (
                           <Button variant="outline" size="sm" className="flex-1" onClick={() => setLeaveToExtend(finalActiveLeave)}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Perpanjang
                            </Button>
                        )}
                        {!isSingleDayLeave && (
                            <Button size="sm" className="flex-1" onClick={() => setLeaveToComplete(finalActiveLeave)}>
                                <Check className="mr-2 h-4 w-4" />
                                Sudah Masuk
                            </Button>
                        )}
                        <Button variant="destructive" size="sm" className="flex-1" onClick={() => setLeaveToDelete({request: finalActiveLeave, isExtension: isExtended})}>
                            <X className="mr-2 h-4 w-4" />
                            {isExtended ? 'Batalkan Perpanjangan' : 'Batalkan'}
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
                <Link href={`/dashboard/riwayat/${student.id}`} passHref>
                    <Button variant="outline" size="sm" className="w-full">
                        <History className="mr-2 h-4 w-4" />
                        Lihat Riwayat
                    </Button>
                </Link>
              </CardFooter>
            </Card>
          )})}
        </div>
         <AlertDialog open={!!leaveToDelete} onOpenChange={(open) => !open && setLeaveToDelete(null)}>
            <AlertDialogContent className="max-w-sm rounded-2xl">
                <AlertDialogHeader className="text-center items-center space-y-0">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10 mb-4">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <AlertDialogTitle className="text-lg">
                        {leaveToDelete?.isExtension ? 'Batalkan Perpanjangan?' : 'Hapus Pengajuan Izin?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="pt-2">
                       {leaveToDelete?.isExtension
                            ? "Aksi ini akan menghapus data perpanjangan terakhir. Izin sebelumnya tidak akan terpengaruh. Tindakan ini tidak dapat diurungkan."
                            : "Aksi ini akan menghapus data izin ini secara permanen. Tindakan ini tidak dapat diurungkan."
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-4">
                    <AlertDialogCancel onClick={() => setLeaveToDelete(null)} disabled={isDeleting}>
                        Jangan Hapus
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                         {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         {leaveToDelete?.isExtension ? 'Ya, Batalkan Perpanjangan' : 'Ya, Hapus Izin'}
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

        <Sheet open={!!leaveToExtend} onOpenChange={(open) => { if (!open) {setLeaveToExtend(null); form.reset();} }}>
            <SheetContent className="flex flex-col">
                 <SheetHeader>
                    <SheetTitle>Perpanjang Izin</SheetTitle>
                    <SheetDescription>
                        Perpanjang izin untuk <strong>{students.find(s => s.leave_requests.some(lr => lr.id === leaveToExtend?.id))?.full_name}</strong>. Pilih durasi perpanjangan dan berikan keterangan jika perlu.
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

    

    



    

    