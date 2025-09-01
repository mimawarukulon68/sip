"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  History, 
  Search, 
  Filter, 
  CheckCircle,
  Thermometer,
  ClipboardList,
  ArrowLeft,
  BookUser,
  Archive,
  Clock,
  FileText,
  RefreshCw,
  Link2,
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
};

type Student = {
    id: string;
    full_name: string;
    classes: {
        class_name: string;
    } | null;
};

type LeaveRequestChain = {
    root: LeaveRequest;
    extensions: LeaveRequest[];
    total_duration: number;
    final_end_date: string;
    final_status: 'AKTIF' | 'SELESAI';
}

export default function StudentHistoryPage({ params }: { params: { studentId: string } }) {
  const { studentId } = use(params);
  const [student, setStudent] = useState<Student | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
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

        const studentPromise = supabase
            .from('students')
            .select(`
                id,
                full_name,
                classes (
                    class_name
                )
            `)
            .eq('id', studentId)
            .single();

        const requestsPromise = supabase
            .from('leave_requests')
            .select('*')
            .eq('student_id', studentId)
            .order('start_date', { ascending: true });

        const [{ data: studentData, error: studentError }, { data: requestsData, error: requestsError }] = await Promise.all([
            studentPromise,
            requestsPromise
        ]);

        if (studentError) console.error("Error fetching student:", studentError);
        if (requestsError) console.error("Error fetching requests:", requestsError);

        setStudent(studentData as Student);
        setLeaveRequests(requestsData as LeaveRequest[] || []);
        setLoading(false);
    }

    fetchData();
  }, [studentId]);


  const leaveRequestChains = leaveRequests
    .filter(req => !req.parent_leave_id) // Hanya mulai dari izin induk
    .map(root => {
        const chain: LeaveRequestChain = {
            root: root,
            extensions: [],
            total_duration: 0,
            final_end_date: root.end_date,
            final_status: root.status
        };

        let currentLeave = root;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const nextLeave = leaveRequests.find(req => req.parent_leave_id === currentLeave.id);
            if (nextLeave) {
                chain.extensions.push(nextLeave);
                currentLeave = nextLeave;
            } else {
                break;
            }
        }
        
        const allInChain = [chain.root, ...chain.extensions];
        chain.total_duration = differenceInCalendarDays(parseISO(allInChain[allInChain.length - 1].end_date), parseISO(chain.root.start_date)) + 1;
        chain.final_end_date = allInChain[allInChain.length - 1].end_date;
        chain.final_status = allInChain[allInChain.length-1].status;
        return chain;
    })
    .sort((a,b) => parseISO(b.root.start_date).getTime() - parseISO(a.root.start_date).getTime());


  const filteredChains = leaveRequestChains.filter(chain => {
    const allReasons = [chain.root.reason, ...chain.extensions.map(ext => ext.reason)].join(' ').toLowerCase();
    const matchesSearch = chain.root.leave_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         allReasons.includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || chain.final_status.toUpperCase() === filterStatus.toUpperCase();
    const matchesType = filterType === "all" || chain.root.leave_type.toUpperCase() === filterType.toUpperCase();

    return matchesSearch && matchesStatus && matchesType;
  });
  
  if (loading) {
     return (
        <div className="flex flex-col min-h-screen bg-muted/20">
          <header className="bg-white border-b py-4">
             <div className="container mx-auto px-4">
                <Skeleton className="h-8 w-64"/>
             </div>
          </header>
          <main className="container mx-auto p-4 md:p-8 space-y-8">
             <Skeleton className="h-40 w-full" />
             <Skeleton className="h-40 w-full" />
             <Skeleton className="h-64 w-full" />
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
  
  const validRequests = leaveRequests.filter(r => r.status === 'AKTIF' || r.status === 'SELESAI');
  const sickRequests = validRequests.filter(r => r.leave_type === 'Sakit');
  const permitRequests = validRequests.filter(r => r.leave_type === 'Izin');
  const activeRequests = leaveRequestChains.filter(r => r.final_status === 'AKTIF').length;
  const completedRequests = leaveRequestChains.filter(r => r.final_status === 'SELESAI').length;

  const totalSickDays = sickRequests.reduce((acc, curr) => acc + differenceInCalendarDays(parseISO(curr.end_date), parseISO(curr.start_date)) + 1, 0);
  const totalPermitDays = permitRequests.reduce((acc, curr) => acc + differenceInCalendarDays(parseISO(curr.end_date), parseISO(curr.start_date)) + 1, 0);
  const totalValidDays = totalSickDays + totalPermitDays;

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
                Ringkasan Perizinan
              </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center text-red-800 text-sm gap-2">
                          <Thermometer className="w-4 h-4" />
                          <span className="font-medium">Sakit</span>
                      </div>
                      <p className="text-xl font-bold text-red-900 mt-1">{sickRequests.length} kali</p>
                      <p className="text-xs text-red-700">{totalSickDays} hari</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center text-blue-800 text-sm gap-2">
                          <ClipboardList className="w-4 h-4" />
                          <span className="font-medium">Izin</span>
                      </div>
                      <p className="text-xl font-bold text-blue-900 mt-1">{permitRequests.length} kali</p>
                      <p className="text-xs text-blue-700">{totalPermitDays} hari</p>
                  </div>
              </div>
              
              <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center text-slate-800 text-sm gap-2">
                      <Archive className="w-4 h-4" />
                      <span className="font-medium">Total Perizinan Siswa</span>
                  </div>
                    <p className="text-xl font-bold text-slate-900 mt-1">{validRequests.length} kali ({totalValidDays} hari)</p>
              </div>
              
              <hr className="my-4"/>

              <div className="grid grid-cols-2 gap-2 text-center text-xs sm:text-sm">
                  <div>
                      <div className="flex items-center justify-center gap-2 text-green-700">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-semibold">Selesai</span>
                      </div>
                      <p className="font-bold text-base mt-1">{completedRequests}</p>
                  </div>
                  <div>
                      <div className="flex items-center justify-center gap-2 text-yellow-700">
                            <Clock className="w-4 h-4" />
                            <span className="font-semibold">Aktif</span>
                      </div>
                      <p className="font-bold text-base mt-1">{activeRequests}</p>
                  </div>
              </div>
          </CardContent>
        </Card>


        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Filter className="w-5 h-5 mr-2" />
              Filter & Pencarian
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <History className="w-5 h-5 mr-2" />
              Detail Riwayat
            </h2>
            <Badge variant="outline">
              Menampilkan {filteredChains.length} hasil
            </Badge>
          </div>
          {filteredChains.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-white rounded-lg border">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>
                {leaveRequests.length === 0 
                  ? "Belum ada riwayat izin untuk siswa ini."
                  : "Tidak ada data yang sesuai dengan filter Anda."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredChains.map((chain) => {
                const isExtended = chain.extensions.length > 0;
                const isSakit = chain.root.leave_type === 'Sakit';
                const allInChain = [chain.root, ...chain.extensions];

                return (
                    <Card key={chain.root.id} className="overflow-hidden">
                        <CardHeader className="p-4 bg-slate-50/70 border-b">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="flex items-center gap-3 text-lg">
                                        <span>{chain.root.leave_type}</span>
                                        {isExtended && (
                                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 border border-amber-200">
                                                <Link2 className="h-3 w-3 mr-1.5" />
                                                Diperpanjang
                                            </Badge>
                                        )}
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {format(parseISO(chain.root.start_date), "d MMM", { locale: id })} - {format(parseISO(chain.final_end_date), "d MMM yyyy", { locale: id })}
                                        <span className="ml-2">({chain.total_duration} hari)</span>
                                    </p>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        chain.final_status === 'AKTIF' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-green-100 text-green-800 border-green-200'
                                    )}
                                >
                                    <Clock className={cn("h-3 w-3 mr-1.5", chain.final_status === 'SELESAI' && 'hidden')} />
                                    <CheckCircle className={cn("h-3 w-3 mr-1.5", chain.final_status === 'AKTIF' && 'hidden')} />
                                    {chain.final_status}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 text-sm">
                            <div className="space-y-1">
                                {allInChain.map((request, index) => {
                                    const duration = differenceInCalendarDays(parseISO(request.end_date), parseISO(request.start_date)) + 1;
                                    const isFirst = index === 0;

                                    return (
                                        <div key={request.id} className={cn("flex items-start gap-4 p-3 rounded-lg", isFirst ? '' : 'pt-3 ')}>
                                             <div className="w-5 pt-0.5 flex-shrink-0">
                                                {isFirst ? (
                                                    isSakit ? <Thermometer className="h-5 w-5 text-red-500"/> : <ClipboardList className="h-5 w-5 text-blue-500"/>
                                                ) : (
                                                    <RefreshCw className="h-5 w-5 text-amber-500"/>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="italic">
                                                    "{request.reason || (isFirst ? "Tidak ada alasan" : "Alasan tidak disebutkan")}"
                                                </p>
                                                 <p className="text-xs text-muted-foreground mt-1">
                                                    {format(parseISO(request.start_date), "d MMM yyyy", { locale: id })} - {format(parseISO(request.end_date), "d MMM yyyy", { locale: id })}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="font-normal">{duration} hari</Badge>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
