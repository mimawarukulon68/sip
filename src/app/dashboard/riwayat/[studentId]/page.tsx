"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { 
  History, 
  Search, 
  Thermometer,
  ClipboardList,
  ArrowLeft,
  BookUser,
  Archive,
  Clock,
  FileText,
  Link2,
  ExternalLink,
  User,
  CalendarDays,
  CircleCheckBig,
} from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LeaveRequest = {
    id: string;
    created_at: string;
    leave_type: 'Sakit' | 'Izin';
    start_date: string;
    end_date: string;
    reason: string | null;
    status: 'AKTIF' | 'SELESAI';
    parent_leave_id: string | null;
    document_url: string | null;
    created_by_user_id: string;
    chain_index?: number;
};

type ParentProfile = {
    full_name: string;
}

type Student = {
    id: string;
    full_name: string;
    classes: {
        class_name: string;
    } | null;
};

export default function StudentHistoryPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  const [student, setStudent] = useState<Student | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [parentProfiles, setParentProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  
  useEffect(() => {
    async function fetchData() {
        if (!studentId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const studentPromise = supabase
            .from('students')
            .select(`id, full_name, classes (class_name)`)
            .eq('id', studentId)
            .single();

        const requestsPromise = supabase
            .from('leave_requests')
            .select(`*`)
            .eq('student_id', studentId)
            .order('start_date', { ascending: true });

        const [{ data: studentData, error: studentError }, { data: rawRequestsData, error: requestsError }] = await Promise.all([
            studentPromise,
            requestsPromise
        ]);

        if (studentError) console.error("Error fetching student:", studentError);
        if (requestsError) console.error("Error fetching requests:", requestsError);

        setStudent(studentData as Student);
        
        if (rawRequestsData) {
            const requestsById = new Map(rawRequestsData.map(req => [req.id, req as LeaveRequest]));
            const processedRequests: LeaveRequest[] = [];
            const chains = new Map<string, LeaveRequest[]>();

            // Group requests by chain
            rawRequestsData.forEach(req => {
                let rootId = req.id;
                let current = req;
                while (current.parent_leave_id) {
                    const parent = requestsById.get(current.parent_leave_id);
                    if (!parent) break;
                    current = parent;
                    rootId = parent.id;
                }
                
                if (!chains.has(rootId)) {
                    chains.set(rootId, []);
                }
                chains.get(rootId)!.push(req as LeaveRequest);
            });

            // Process each chain
            chains.forEach(chain => {
                const sortedChain = chain.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
                sortedChain.forEach((req, index) => {
                    processedRequests.push({ ...req, chain_index: index });
                });
            });

            setLeaveRequests(processedRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }

        if(rawRequestsData && rawRequestsData.length > 0) {
            const userIds = [...new Set(rawRequestsData.map(req => req.created_by_user_id))];
            const { data: profiles, error: profilesError } = await supabase
                .from('parent_profiles')
                .select('user_id, full_name')
                .in('user_id', userIds);

            if (profilesError) {
                console.error("Error fetching parent profiles:", profilesError);
            } else if (profiles) {
                const profilesMap = new Map(profiles.map(p => [p.user_id, p.full_name]));
                setParentProfiles(profilesMap);
            }
        }
        
        setLoading(false);
    }

    fetchData();
  }, [studentId]);


  const getParentLeave = (parentId: string | null) => {
    if (!parentId) return null;
    return leaveRequests.find(req => req.id === parentId);
  }

  const filteredRequests = useMemo(() => leaveRequests.filter(request => {
    const reasonMatch = request.reason ? request.reason.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const parentReasonMatch = (getParentLeave(request.parent_leave_id)?.reason || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSearch = !searchTerm || reasonMatch || (request.parent_leave_id && parentReasonMatch);
    const matchesStatus = filterStatus === "all" || request.status.toUpperCase() === filterStatus.toUpperCase();
    const matchesType = filterType === "all" || request.leave_type.toUpperCase() === filterType.toUpperCase();
    return matchesSearch && matchesStatus && matchesType;
  }), [leaveRequests, searchTerm, filterStatus, filterType]);
  
  if (loading) {
     return (
        <div className="flex flex-col min-h-screen bg-muted/20">
          <header className="bg-white border-b py-4">
             <div className="container mx-auto px-4">
                <Skeleton className="h-8 w-64"/>
             </div>
          </header>
          <main className="container mx-auto p-4 md:p-8 space-y-8">
             <Skeleton className="h-40 w-full rounded-xl" />
             <Skeleton className="h-40 w-full rounded-xl" />
             <Skeleton className="h-64 w-full rounded-xl" />
          </main>
        </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <Card className="text-center">
            <CardHeader>
                <CardTitle>Siswa Tidak Ditemukan</CardTitle>
                <CardDescription>Data siswa dengan ID ini tidak dapat ditemukan.</CardDescription>
            </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const totalSubmissions = leaveRequests.length;
  const sickSubmissions = leaveRequests.filter(r => r.leave_type === 'Sakit').length;
  const permitSubmissions = leaveRequests.filter(r => r.leave_type === 'Izin').length;
  const activeSubmissions = leaveRequests.filter(r => r.status === 'AKTIF').length;
  const completedSubmissions = leaveRequests.filter(r => r.status === 'SELESAI').length;

  const totalSickDays = leaveRequests.filter(r => r.leave_type === 'Sakit').reduce((acc, curr) => acc + differenceInCalendarDays(parseISO(curr.end_date), parseISO(curr.start_date)) + 1, 0);
  const totalPermitDays = leaveRequests.filter(r => r.leave_type === 'Izin').reduce((acc, curr) => acc + differenceInCalendarDays(parseISO(curr.end_date), parseISO(curr.start_date)) + 1, 0);

  return (
    <div className="min-h-screen w-full flex-col bg-muted/10">
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-14 sm:h-16">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard" className="mr-2">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                            <span className="sr-only">Kembali</span>
                        </Button>
                    </Link>
                     <div className="text-left">
                        <h1 className="text-base sm:text-lg font-semibold text-gray-900">Riwayat Perizinan</h1>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {student.full_name} - {student.classes?.class_name}
                        </p>
                    </div>
                </div>
                <Avatar className="w-9 h-9">
                    <AvatarImage src={`https://i.pravatar.cc/150?u=${student.id}`} alt={student.full_name} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                        {student.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                </Avatar>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <Card>
          <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <BookUser className="w-5 h-5 mr-2" />
                Ringkasan Pengajuan
              </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center text-slate-800 text-sm gap-2">
                      <Archive className="w-4 h-4" />
                      <span className="font-medium">Total Pengajuan</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-1">{totalSubmissions} kali</p>
              </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center text-red-800 text-sm gap-2">
                          <Thermometer className="w-4 h-4" />
                          <span className="font-medium">Sakit</span>
                      </div>
                      <p className="text-lg font-bold text-red-900 mt-1">{sickSubmissions} kali</p>
                      <p className="text-xs text-red-700">{totalSickDays} hari</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center text-blue-800 text-sm gap-2">
                          <ClipboardList className="w-4 h-4" />
                          <span className="font-medium">Izin</span>
                      </div>
                      <p className="text-lg font-bold text-blue-900 mt-1">{permitSubmissions} kali</p>
                      <p className="text-xs text-blue-700">{totalPermitDays} hari</p>
                  </div>
              </div>
              
              <hr className="my-4"/>

              <div className="grid grid-cols-2 gap-2 text-center text-xs sm:text-sm">
                  <div>
                      <div className="flex items-center justify-center gap-2 text-green-700">
                            <CircleCheckBig className="w-4 h-4" />
                            <span className="font-semibold">Selesai</span>
                      </div>
                      <p className="font-bold text-base mt-1">{completedSubmissions}</p>
                  </div>
                  <div>
                      <div className="flex items-center justify-center gap-2 text-yellow-700">
                            <Clock className="w-4 h-4" />
                            <span className="font-semibold">Aktif</span>
                      </div>
                      <p className="font-bold text-base mt-1">{activeSubmissions}</p>
                  </div>
              </div>
          </CardContent>
        </Card>

        <div className="w-full space-y-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <History className="w-5 h-5 mr-2" />
                Detail Riwayat Pengajuan
              </CardTitle>
              <CardDescription>
                Cari atau filter riwayat pengajuan izin berdasarkan status atau jenis izin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6 pt-0">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari alasan..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="AKTIF">Aktif</SelectItem>
                    <SelectItem value="SELESAI">Selesai</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Jenis</SelectItem>
                    <SelectItem value="Sakit">Sakit</SelectItem>
                    <SelectItem value="Izin">Izin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-2 flex justify-center">
                  <Badge variant="outline">
                      Menampilkan {filteredRequests.length} dari {totalSubmissions} hasil
                  </Badge>
              </div>
            </CardContent>
          </Card>
        </div>


        <div className="space-y-2">
          {filteredRequests.length === 0 ? (
            <Card>
                <CardContent className="text-center py-16 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>
                    {leaveRequests.length === 0 
                      ? "Belum ada riwayat izin untuk siswa ini."
                      : "Tidak ada data yang sesuai dengan filter Anda."
                    }
                  </p>
                </CardContent>
            </Card>
          ) : (
            <Accordion type="single" collapsible className="w-full space-y-2">
              {filteredRequests.map((request) => {
                const isExtension = request.chain_index !== undefined && request.chain_index > 0;
                const parentLeave = getParentLeave(request.parent_leave_id);
                const isSakit = request.leave_type === 'Sakit';
                const duration = differenceInCalendarDays(parseISO(request.end_date), parseISO(request.start_date)) + 1;
                const submitterName = parentProfiles.get(request.created_by_user_id) || 'N/A';

                return (
                  <Card key={request.id} className="overflow-hidden rounded-lg">
                    <AccordionItem value={request.id} className="border-b-0">
                        <AccordionTrigger className="p-3 hover:no-underline data-[state=open]:bg-slate-50">
                            <div className="flex flex-col items-start text-left flex-1 gap-2">
                               <div className="flex items-center gap-2 flex-wrap">
                                   <Badge variant={isSakit ? "destructive" : "secondary"} className="text-sm">
                                      {isSakit ? <Thermometer className="h-4 w-4 mr-1.5" /> : <ClipboardList className="h-4 w-4 mr-1.5" />}
                                      {request.leave_type}
                                    </Badge>
                                    {isExtension && (
                                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                                            <Link2 className="h-3 w-3 mr-1.5" />
                                            Perpanjangan {request.chain_index}
                                        </Badge>
                                    )}
                               </div>
                                <p className="text-sm text-muted-foreground font-semibold">
                                    {format(parseISO(request.start_date), "dd MMM", { locale: id })} - {format(parseISO(request.end_date), "dd MMM yyyy", { locale: id })}
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-2 mx-2">
                                <Badge variant="outline">{duration} hari</Badge>
                                 <Badge
                                    variant="outline"
                                    className={cn(
                                        "capitalize",
                                        request.status === 'AKTIF' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-green-100 text-green-800 border-green-200'
                                    )}
                                >
                                    <Clock className={cn("h-3 w-3 mr-1.5", request.status === 'SELESAI' && 'hidden')} />
                                    <CircleCheckBig className={cn("h-3 w-3 mr-1.5", request.status === 'AKTIF' && 'hidden')} />
                                    {request.status.toLowerCase()}
                                </Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 border-t text-sm bg-slate-50">
                           {isExtension && parentLeave && (
                             <div className="mb-3 text-xs p-2 bg-amber-100 border border-amber-200 rounded-md text-amber-900">
                                Menjadi perpanjangan dari izin <strong>{parentLeave.leave_type}</strong> pada tanggal <strong>{format(parseISO(parentLeave.start_date), "d MMM")} - {format(parseISO(parentLeave.end_date), "d MMM yyyy")}</strong>.
                             </div>
                           )}
                           <div className="space-y-4 py-2">
                               <div className="grid grid-cols-3 items-start gap-4">
                                   <div className="col-span-1 text-muted-foreground flex items-center gap-2 pt-1"><FileText className="h-4 w-4"/>Alasan</div>
                                   <div className="col-span-2 font-medium italic bg-white p-2 rounded-md">"{request.reason || "Tidak ada alasan"}"</div>
                               </div>
                               <div className="grid grid-cols-3 items-center gap-4">
                                   <div className="col-span-1 text-muted-foreground flex items-center gap-2"><User className="h-4 w-4"/>Diajukan oleh</div>
                                   <div className="col-span-2 font-medium">{submitterName}</div>
                               </div>
                               <div className="grid grid-cols-3 items-center gap-4">
                                   <div className="col-span-1 text-muted-foreground flex items-center gap-2"><CalendarDays className="h-4 w-4"/>Diajukan pada</div>
                                   <div className="col-span-2 font-medium">{format(parseISO(request.created_at), "EEEE, d MMM yyyy 'pukul' HH:mm", { locale: id })}</div>
                               </div>
                           </div>
                           {request.document_url && (
                            <div className="mt-4 pt-4 border-t flex justify-end">
                                  <Button asChild size="sm">
                                      <a href={request.document_url} target="_blank" rel="noopener noreferrer">
                                          <ExternalLink className="mr-2 h-4 w-4"/>
                                          Lihat Dokumen
                                      </a>
                                  </Button>
                            </div>
                           )}
                        </AccordionContent>
                      </AccordionItem>
                  </Card>
                )
              })}
            </Accordion>
          )}
        </div>
      </main>
    </div>
  );
}
