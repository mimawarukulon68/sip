
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { RefreshCcwDot, PlusCircle, RefreshCw, CircleCheckBig, CircleX, Calendar, History, FileSignature, User, LogOut, CalendarRange, Loader2, AlertTriangle, Thermometer, FileText, Archive, BookPlus, HelpCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, differenceInCalendarDays, parseISO, isWithinInterval, addDays, isPast, isToday, isAfter, startOfToday, isBefore, subDays, isSameDay } from "date-fns";
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
  
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [leaveToDelete, setLeaveToDelete] = React.useState<{request: LeaveRequest, isExtension: boolean} | null>(null);

  const [isCompleting, setIsCompleting] = React.useState(false);
  const [leaveToComplete, setLeaveToComplete] = React.useState<LeaveRequest | null>(null);
  
  const [lateSubmissionType, setLateSubmissionType] = React.useState<'extend-late' | 'new-late'>('new-late');
  const [lateSubmissionStudentId, setLateSubmissionStudentId] = React.useState<string | null>(null);
  
  const [showExtensionDialog, setShowExtensionDialog] = React.useState(false);
  const [extensionDialogData, setExtensionDialogData] = React.useState<{student: StudentData, leave: LeaveRequest} | null>(null);

  const [showExtensionConfirmDialog, setShowExtensionConfirmDialog] = React.useState(false);
  const [extensionConfirmData, setExtensionConfirmData] = React.useState<{studentId: string, leaveId: string} | null>(null);

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
                    .filter(lr => lr.status === 'AKTIF' && isBefore(parseISO(lr.end_date), today))
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
                setStudents((refreshedStudentData as unknown as StudentData[]) || []);
            } else {
                setStudents(studentData as unknown as StudentData[]);
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
  
  const handleLateSubmissionContinue = () => {
    if (!lateSubmissionStudentId) return;
    router.push(`/dashboard/izin-susulan?studentId=${lateSubmissionStudentId}&type=${lateSubmissionType}`);
  }

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
      today.setHours(0,0,0,0);
      
      const { error } = await supabase
        .from('leave_requests')
        .update({ 
            status: 'SELESAI', 
            end_date: format(subDays(today,1), 'yyyy-MM-dd') 
        })
        .eq('id', leaveToComplete.id)
        .lt('start_date', format(today, 'yyyy-MM-dd'));

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
  
  const handleExtensionDialogAction = (action: 'extend' | 'new') => {
      if (!extensionDialogData) return;
      
      if (action === 'extend') {
          router.push(`/dashboard/izin?studentId=${extensionDialogData.student.id}&extend=${extensionDialogData.leave.id}`);
      } else {
          router.push(`/dashboard/izin?studentId=${extensionDialogData.student.id}`);
      }
      setShowExtensionDialog(false);
  }
  
  const handleCreateLeaveClick = (student: StudentData) => {
      const yesterday = subDays(startOfToday(), 1);
      const extendableLeave = student.leave_requests.find(lr => {
          if (lr.status !== 'SELESAI') return false;
          const endDate = parseISO(lr.end_date);
          return isSameDay(endDate, yesterday);
      });


      if (extendableLeave) {
          setExtensionDialogData({ student, leave: extendableLeave });
          setShowExtensionDialog(true);
      } else {
          router.push(`/dashboard/izin?studentId=${student.id}`);
      }
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
              const selectedPeriod = allAcademicPeriods.find(p => p.id === selectedPeriodId);
              
              const periodRequests = selectedPeriod ? student.leave_requests.filter(lr => {
                  const leaveStartDate = parseISO(lr.start_date);
                  const periodInterval = { start: parseISO(selectedPeriod.start_date), end: parseISO(selectedPeriod.end_date) };
                  return isWithinInterval(leaveStartDate, periodInterval);
              }) : [];

              const activeLeave = periodRequests.find(lr => lr.status === 'AKTIF');
              let finalActiveLeave: LeaveRequest | undefined = undefined;
              let fullLeaveChain: LeaveRequest[] = [];
              let combinedStartDate: string | undefined;

              if (activeLeave) {
                  let currentLeave = activeLeave;
                  // Traverse up to find the root of the chain
                  while (currentLeave.parent_leave_id) {
                      const parent = periodRequests.find(lr => lr.id === currentLeave.parent_leave_id);
                      if (parent) {
                          currentLeave = parent;
                      } else {
                          break; // Should not happen in consistent data
                      }
                  }
                  const rootLeave = currentLeave;
                  
                  // Now, find the last leave in this specific chain
                  finalActiveLeave = findLastLeaveInChain(rootLeave, periodRequests);

                  // Reconstruct the full chain from the identified root
                  let current = finalActiveLeave;
                  fullLeaveChain.unshift(current);
                  while(current.parent_leave_id){
                      const parent = periodRequests.find(lr => lr.id === current.parent_leave_id);
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
                            
              const validRequests = periodRequests.filter(lr => lr.status === 'AKTIF' || lr.status === 'SELESAI');

              const sakitAttendance = validRequests.filter(lr => lr.leave_type === 'Sakit');
              const izinAttendance = validRequests.filter(lr => lr.leave_type === 'Izin');
              
              const totalSakitDays = sakitAttendance.reduce((acc, curr) => acc + differenceInCalendarDays(parseISO(curr.end_date), parseISO(curr.start_date)) + 1, 0);
              const totalIzinDays = izinAttendance.reduce((acc, curr) => acc + differenceInCalendarDays(parseISO(curr.end_date), parseISO(curr.start_date)) + 1, 0);
              const totalValidDays = totalSakitDays + totalIzinDays;
              
              const finalEndDate = finalActiveLeave ? parseISO(finalActiveLeave.end_date) : null;
              const totalDuration = finalActiveLeave && combinedStartDate ? differenceInCalendarDays(finalEndDate!, parseISO(combinedStartDate)) + 1 : 0;
              
              const canCancel = !!finalActiveLeave;
              const isTodayLastDayOfLeave = finalActiveLeave ? isSameDay(startOfToday(), parseISO(finalActiveLeave.end_date)) : false;
              const canExtend = canCancel && isTodayLastDayOfLeave;

              const isSingleDayLeave = finalActiveLeave ? isSameDay(parseISO(finalActiveLeave.start_date), parseISO(finalActiveLeave.end_date)) : false;
              const canComplete = finalActiveLeave && !isSingleDayLeave && isAfter(startOfToday(), parseISO(combinedStartDate as string));

              const isCurrentPeriodActive = currentAcademicPeriod?.id === selectedPeriodId;


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
                          {totalDuration === 1 ? (
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
                                     return (
                                         <div key={request.id} className="flex items-start gap-3">
                                             <div className="w-5 pt-0.5">
                                                 {index === 0 ? (
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
                        {canExtend && isCurrentPeriodActive && (
                           <Button variant="outline" size="sm" className="w-full flex-1" onClick={() => {
                              setExtensionConfirmData({ studentId: student.id, leaveId: finalActiveLeave.id });
                              setShowExtensionConfirmDialog(true);
                           }}>
                               <RefreshCw className="mr-2 h-4 w-4" />
                               Perpanjang
                           </Button>
                        )}
                        {canComplete && (
                            <Button size="sm" className="flex-1" onClick={() => setLeaveToComplete(finalActiveLeave)}>
                                <CircleCheckBig className="mr-2 h-4 w-4" />
                                Sudah Masuk
                            </Button>
                        )}
                         {canCancel && (
                            <Button variant="destructive" size="sm" className="flex-1" onClick={() => setLeaveToDelete({request: finalActiveLeave, isExtension: isExtended})}>
                                <CircleX className="mr-2 h-4 w-4" />
                                {isExtended ? 'Batalkan Perpanjangan' : 'Batalkan'}
                            </Button>
                         )}
                    </>
                    ) : (
                      <>
                        {isCurrentPeriodActive && (
                          <>
                            <Button size="sm" className="flex-1" onClick={() => handleCreateLeaveClick(student)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Buat Izin
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setLateSubmissionStudentId(student.id)}>
                                        <BookPlus className="mr-2 h-4 w-4" />
                                        Izin Susulan
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Jenis Pengajuan Izin Susulan</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Pilih jenis pengajuan yang sesuai. Ini akan menentukan langkah Anda selanjutnya.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="py-4">
                                        <RadioGroup defaultValue="new-late" onValueChange={(value: 'new-late' | 'extend-late') => setLateSubmissionType(value)}>
                                            <div className="flex items-start space-x-4 rounded-md border p-4">
                                                <RadioGroupItem value="extend-late" id="r1" />
                                                <Label htmlFor="r1" className="flex flex-col space-y-1">
                                                    <span className="font-bold">Perpanjangan dari Izin Sebelumnya</span>
                                                    <span className="text-sm font-normal text-muted-foreground">Pilih ini jika Anda ingin memperpanjang izin yang baru saja selesai.</span>
                                                </Label>
                                            </div>
                                            <div className="flex items-start space-x-4 rounded-md border p-4">
                                                <RadioGroupItem value="new-late" id="r2" />
                                                <Label htmlFor="r2" className="flex flex-col space-y-1">
                                                   <span className="font-bold">Izin Baru yang Terlambat Diajukan</span>
                                                   <span className="text-sm font-normal text-muted-foreground">Pilih ini untuk membuat pengajuan izin baru untuk tanggal yang sudah lewat.</span>
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleLateSubmissionContinue}>Lanjutkan</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
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
                        {leaveToDelete?.isExtension ? 'Batalkan Perpanjangan?' : 'Batalkan Pengajuan Izin?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="pt-2">
                       {leaveToDelete?.isExtension
                            ? "Aksi ini akan menghapus data perpanjangan terakhir. Izin sebelumnya tidak akan terpengaruh. Tindakan ini tidak dapat diurungkan."
                            : "Aksi ini akan membatalkan seluruh rangkaian izin ini secara permanen. Tindakan ini tidak dapat diurungkan."
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-4">
                    <AlertDialogCancel onClick={() => setLeaveToDelete(null)} disabled={isDeleting}>
                        Jangan Batalkan
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                         {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         {leaveToDelete?.isExtension ? 'Ya, Batalkan Perpanjangan' : 'Ya, Batalkan Izin'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!leaveToComplete} onOpenChange={(open) => !open && setLeaveToComplete(null)}>
            <AlertDialogContent className="max-w-sm rounded-2xl">
                <AlertDialogHeader className="text-center items-center">
                     <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10 mb-4">
                        <CircleCheckBig className="h-6 w-6 text-green-600" />
                    </div>
                    <AlertDialogTitle className="text-lg">Konfirmasi Siswa Sudah Masuk?</AlertDialogTitle>
                    <AlertDialogDescription className="pt-2">
                        Aksi ini akan mengubah status izin dari <b>AKTIF</b> menjadi <b>SELESAI</b>. Tanggal akhir izin akan disesuaikan menjadi hari kemarin.
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

        <AlertDialog open={showExtensionDialog} onOpenChange={setShowExtensionDialog}>
            <AlertDialogContent className="max-w-sm rounded-2xl">
                <AlertDialogHeader className="text-center items-center">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10 mb-4">
                        <RefreshCcwDot className="h-6 w-6 text-green-600" />
                    </div>
                    <AlertDialogTitle className="text-lg">Deteksi Perpanjangan</AlertDialogTitle>
                    <AlertDialogDescription className="pt-2">
                        Izin <strong>{extensionDialogData?.leave.leave_type}</strong> untuk <strong>{extensionDialogData?.student.full_name}</strong> baru saja berakhir kemarin.
                        Apakah Anda ingin memperpanjang izin tersebut atau membuat pengajuan baru?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row sm:justify-end gap-2 pt-4">
                    <AlertDialogCancel onClick={() => setShowExtensionDialog(false)}>
                        Batal
                    </AlertDialogCancel>
                    <Button variant="outline" onClick={() => handleExtensionDialogAction('new')}>
                        Buat Izin Baru
                    </Button>
                    <AlertDialogAction onClick={() => handleExtensionDialogAction('extend')}>
                        Ya, Perpanjang Izin
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showExtensionConfirmDialog} onOpenChange={setShowExtensionConfirmDialog}>
            <AlertDialogContent className="max-w-sm rounded-2xl">
                <AlertDialogHeader className="text-center items-center">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10 mb-4">
                        <RefreshCw className="h-6 w-6 text-green-600" />
                    </div>
                    <AlertDialogTitle className="text-lg">Konfirmasi Perpanjangan Izin</AlertDialogTitle>
                    <AlertDialogDescription className="pt-2">
                       Anda akan memperpanjang izin yang sedang aktif. Anda akan diarahkan ke formulir perpanjangan. Lanjutkan?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="pt-4">
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={() => {
                        if (extensionConfirmData) {
                            router.push(`/dashboard/izin?studentId=${extensionConfirmData.studentId}&extend=${extensionConfirmData.leaveId}`);
                        }
                        setShowExtensionConfirmDialog(false);
                    }}>
                        Lanjutkan
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </main>
    </div>
  );
}

    