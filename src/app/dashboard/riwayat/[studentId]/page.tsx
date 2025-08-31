
"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  History, 
  Search, 
  Filter, 
  Calendar,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Thermometer,
  ClipboardList,
  ArrowLeft,
  Loader2,
  BookUser,
  Archive,
  ArchiveX,
  Ban
} from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

type LeaveRequest = {
    id: string;
    created_at: string;
    leave_type: 'Sakit' | 'Izin';
    start_date: string;
    end_date: string;
    reason: string | null;
    status: 'AKTIF' | 'SELESAI' | 'DIBATALKAN';
};

type Student = {
    id: string;
    full_name: string;
    classes: {
        class_name: string;
    } | null;
};

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
            .order('created_at', { ascending: false });

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


  const filteredRequests = leaveRequests.filter(request => {
    const matchesSearch = request.leave_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (request.reason && request.reason.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === "all" || request.status === filterStatus;
    const matchesType = filterType === "all" || request.leave_type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AKTIF':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            AKTIF
          </Badge>
        );
      case 'SELESAI':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            SELESAI
          </Badge>
        );
      case 'DIBATALKAN':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            DIBATALKAN
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'Sakit' ? 
      <Thermometer className="w-4 h-4 text-red-500" /> : 
      <ClipboardList className="w-4 h-4 text-blue-500" />;
  };
  
  const calculateDuration = (startDate: string, endDate: string) => {
    const diffDays = differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1;
    return diffDays === 1 ? '1 hari' : `${diffDays} hari`;
  };

  if (loading) {
     return (
        <div className="flex flex-col min-h-screen bg-muted/20">
          <header className="bg-white border-b py-4">
             <div className="container mx-auto px-4">
                <Skeleton className="h-8 w-64"/>
             </div>
          </header>
          <main className="container mx-auto p-4 md:p-8 space-y-8">
            <div className="flex items-center space-x-4">
                <Skeleton className="w-16 h-16 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-5 w-32" />
                </div>
            </div>
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
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
  
  const stats = {
    total: leaveRequests.length,
    active: leaveRequests.filter(r => r.status === 'AKTIF').length,
    completed: leaveRequests.filter(r => r.status === 'SELESAI').length,
    cancelled: leaveRequests.filter(r => r.status === 'DIBATALKAN').length,
    sick: leaveRequests.filter(r => r.status !== 'DIBATALKAN' && r.leave_type === 'Sakit').length,
    permit: leaveRequests.filter(r => r.status !== 'DIBATALKAN' && r.leave_type === 'Izin').length,
  };


  return (
    <div className="min-h-screen w-full flex-col bg-muted/10">
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-14 sm:h-16">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="sr-only">Kembali</span>
                    </Button>
                </Link>
                <div className="text-center">
                    <h1 className="text-base sm:text-lg font-semibold text-gray-900">Riwayat Perizinan</h1>
                    <p className="text-xs sm:text-sm text-gray-600">{student.full_name}</p>
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
        <div className="flex items-center space-x-4">
            <Avatar className="w-16 h-16 border-2 border-primary/20">
                <AvatarImage src={`https://i.pravatar.cc/150?u=${student.id}`} alt={student.full_name} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {student.full_name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{student.full_name}</h1>
              <p className="text-md text-muted-foreground">
                Kelas {student.classes?.class_name || 'N/A'}
              </p>
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard icon={BookUser} title="Total Izin" value={stats.total} color="text-blue-600" />
            <StatCard icon={Clock} title="Aktif" value={stats.active} color="text-yellow-600" />
            <StatCard icon={CheckCircle} title="Selesai" value={stats.completed} color="text-green-600" />
            <StatCard icon={XCircle} title="Dibatalkan" value={stats.cancelled} color="text-red-600" />
            <StatCard icon={Thermometer} title="Sakit" value={stats.sick} color="text-red-600" />
            <StatCard icon={ClipboardList} title="Izin" value={stats.permit} color="text-blue-600" />
        </div>

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
                  <SelectItem value="DIBATALKAN">Dibatalkan</SelectItem>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Detail Riwayat
              </span>
              <Badge variant="outline">
                Menampilkan {filteredRequests.length} hasil
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>
                  {leaveRequests.length === 0 
                    ? "Belum ada riwayat izin untuk siswa ini."
                    : "Tidak ada data yang sesuai dengan filter Anda."
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jenis Izin</TableHead>
                      <TableHead>Tanggal Mulai</TableHead>
                      <TableHead>Tanggal Selesai</TableHead>
                      <TableHead>Durasi</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Alasan</TableHead>
                      <TableHead>Dibuat Pada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                        <TableRow key={request.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getTypeIcon(request.leave_type)}
                              <span className="font-medium">{request.leave_type}</span>
                            </div>
                          </TableCell>
                          <TableCell>{format(parseISO(request.start_date), "d MMM yyyy", { locale: id })}</TableCell>
                          <TableCell>{format(parseISO(request.end_date), "d MMM yyyy", { locale: id })}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {calculateDuration(request.start_date, request.end_date)}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate" title={request.reason || ''}>
                              {request.reason || "-"}
                            </div>
                          </TableCell>
                          <TableCell>{format(parseISO(request.created_at), "d MMM yyyy, HH:mm", { locale: id })}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


function StatCard({ icon: Icon, title, value, color }: { icon: React.ElementType, title: string, value: number, color: string }) {
    return (
        <Card>
            <CardContent className="p-4 text-center">
              <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </CardContent>
        </Card>
    )
}
