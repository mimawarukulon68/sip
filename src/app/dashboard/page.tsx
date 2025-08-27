
"use client";
import Link from "next/link";
import * as React from "react";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, RefreshCw, Check, X, Calendar, History, ClipboardList, User, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


// Mock data for students and academic period
const students = [
  {
    id: 1,
    name: "MOCHAMMAD ALIFIKUROFIQ YAZIZ ABDULLAH",
    class: "Kelas 4",
    permissionStatus: null,
    attendance: { sakit: { count: 2, days: 3 }, izin: { count: 1, days: 1 } },
  },
  {
    id: 2,
    name: "Citra Dewi",
    class: "Kelas 2",
    permissionStatus: {
      status: "Sakit",
      endDate: "2024-08-25",
    },
    attendance: { sakit: { count: 1, days: 2 }, izin: { count: 0, days: 0 } },
  },
   {
    id: 3,
    name: "Eka Fitri",
    class: "Kelas 6",
    permissionStatus: {
      status: "Izin",
      endDate: "2024-08-24",
    },
    attendance: { sakit: { count: 0, days: 0 }, izin: { count: 3, days: 5 } },
  },
];

const academicPeriods = {
  "2025/2026": ["Semester 1", "Semester 2", "Tengah Semester 1", "Tengah Semester 2", "Satu Tahun Ajaran"],
  "2024/2025": ["Semester 1", "Semester 2", "Tengah Semester 1", "Tengah Semester 2", "Satu Tahun Ajaran"],
};

const getBadgeInfo = (status: {status: string, endDate: string} | null) => {
    if (!status) return { text: "Aktif Masuk", className: "bg-green-100 text-green-800 border-green-200" };
    if (status.status.toLowerCase() === 'sakit') return { text: "Sakit", className: "bg-red-100 text-red-800 border-red-200" };
    if (status.status.toLowerCase() === 'izin') return { text: "Izin", className: "bg-yellow-100 text-yellow-800 border-yellow-200" };
    return { text: "Status Tidak Diketahui", className: "bg-gray-100 text-gray-800 border-gray-200" };
}


export default function DashboardPage() {
  const parentName = "Budi Santoso"; // This would be dynamic based on logged in user
  const [selectedYear, setSelectedYear] = React.useState("2025/2026");
  const [selectedPeriod, setSelectedPeriod] = React.useState("Semester 1");

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/10">
       <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-14 sm:h-16">
                <div className="flex items-center">
                    <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center mr-2">
                        <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-base sm:text-lg font-semibold text-gray-900">Sistem Perizinan Siswa</h1>
                        <p className="text-xs sm:text-sm text-gray-600">Dashboard Orang Tua/Wali Murid</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" className="text-xs px-2 h-9">
                    <LogOut className="w-3 h-3 mr-1" />
                    Keluar
                </Button>
            </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <div className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight">
            Selamat Datang Bapak/Ibu {parentName}
          </h1>
          <p className="text-muted-foreground">
            Kelola perizinan dan pantau ringkasan absensi putra/putri Anda di sini.
          </p>
        </div>

        <Card className="p-6 bg-card">
             <h3 className="text-lg font-semibold mb-4">Periode Akademik</h3>
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full">
                    <p className="text-sm font-medium mb-2 text-card-foreground">Tahun Ajaran</p>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih tahun ajaran" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {Object.keys(academicPeriods).map(year => (
                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex-1 w-full">
                    <p className="text-sm font-medium mb-2 text-card-foreground">Periode Laporan</p>
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih periode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {(academicPeriods[selectedYear as keyof typeof academicPeriods] || []).map(period => (
                                    <SelectItem key={period} value={period}>{period}</SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </Card>


        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => {
              const badgeInfo = getBadgeInfo(student.permissionStatus);
              const totalIzinCount = student.attendance.sakit.count + student.attendance.izin.count;
              const totalIzinDays = student.attendance.sakit.days + student.attendance.izin.days;

            return (
            <Card key={student.id} className="shadow-md rounded-xl flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                 <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={`https://i.pravatar.cc/150?u=${student.id}`} alt={student.name} />
                    <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{student.name}</CardTitle>
                    <CardDescription>{student.class}</CardDescription>
                  </div>
                </div>
              </CardHeader>
               <div className="p-4 pt-4 pb-0">
                  <Badge variant="outline" className={`w-full justify-center ${badgeInfo.className}`}>
                        {badgeInfo.text}
                  </Badge>
                </div>
              <CardContent className="space-y-4 flex-grow pt-4 pb-4">
                 <div className="border bg-slate-50/50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                      <ClipboardList className="h-4 w-4 text-gray-600"/>
                      Ringkasan Perizinan Siswa
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-3">
                            <div className="bg-red-50 rounded-lg p-3">
                                <div className="text-xs text-red-600">Sakit</div>
                                <div className="text-sm font-semibold text-red-700">{student.attendance.sakit.count} kali ({student.attendance.sakit.days} hari)</div>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-3">
                                <div className="text-xs text-yellow-600">Izin</div>
                                <div className="text-sm font-semibold text-yellow-700">{student.attendance.izin.count} kali ({student.attendance.izin.days} hari)</div>
                            </div>
                        </div>
                         <div className="bg-slate-100 rounded-lg p-3 flex flex-col justify-center items-center text-center">
                            <div className="text-xs text-slate-600">Total Izin</div>
                            <div className="text-lg font-bold text-slate-900">{totalIzinCount} kali</div>
                            <div className="text-sm text-slate-800">({totalIzinDays} hari)</div>
                        </div>
                    </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col items-stretch gap-2 bg-slate-50 p-4 border-t">
                 <div className="flex gap-2 flex-wrap">
                    {student.permissionStatus ? (
                     <>
                        <Button variant="outline" size="sm" className="flex-1">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Perpanjang
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
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
