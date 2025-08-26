
"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, RefreshCw, Check, X, Calendar, History } from "lucide-react";

// Mock data for students and academic period
const students = [
  {
    id: 1,
    name: "Ahmad Budi",
    class: "Kelas 4",
    permissionStatus: null,
    attendance: { sakit: 2, izin: 1 },
  },
  {
    id: 2,
    name: "Citra Dewi",
    class: "Kelas 2",
    permissionStatus: {
      status: "Sakit",
      endDate: "2024-08-25",
      color: "red",
    },
    attendance: { sakit: 1, izin: 0 },
  },
   {
    id: 3,
    name: "Eka Fitri",
    class: "Kelas 6",
    permissionStatus: {
      status: "Izin",
      endDate: "2024-08-24",
      color: "yellow",
    },
    attendance: { sakit: 0, izin: 3 },
  },
];

const currentAcademicPeriod = {
    name: "Tengah Semester 1",
    dates: "15 Juli 2024 - 15 September 2024"
};

const getBadgeInfo = (status: {status: string, endDate: string, color: string} | null) => {
    if (!status) return { text: "Aktif Masuk", className: "bg-green-100 text-green-800 border-green-200" };
    const formattedDate = new Date(status.endDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    if (status.status.toLowerCase() === 'sakit') return { text: `Sedang Sakit hingga ${formattedDate}`, className: "bg-red-100 text-red-800 border-red-200" };
    if (status.status.toLowerCase() === 'izin') return { text: `Sedang Izin hingga ${formattedDate}`, className: "bg-yellow-100 text-yellow-800 border-yellow-200" };
    return { text: "Status Tidak Diketahui", className: "bg-gray-100 text-gray-800 border-gray-200" };
}


export default function DashboardPage() {
  const parentName = "Wali Murid"; // This would be dynamic based on logged in user

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/10">
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <div className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight">
            Selamat Datang Bapak/Ibu {parentName}
          </h1>
          <p className="text-muted-foreground">
            Kelola perizinan dan pantau ringkasan absensi putra/putri Anda di sini.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => {
              const badgeInfo = getBadgeInfo(student.permissionStatus);
              const totalIzin = student.attendance.sakit + student.attendance.izin;
            return (
            <Card key={student.id} className="shadow-md rounded-xl flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-xl">{student.name}</CardTitle>
                    <CardDescription>{student.class}</CardDescription>
                </div>
                 <Badge variant="outline" className={badgeInfo.className}>
                      {badgeInfo.text}
                 </Badge>
              </CardHeader>
              <CardContent className="space-y-4 flex-grow">
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2 text-sm">Ringkasan Absensi Periode Berjalan</h4>
                  <p className="text-xs text-muted-foreground mb-2">{currentAcademicPeriod.name} ({currentAcademicPeriod.dates})</p>
                  <div className="text-sm space-y-1">
                      <p>Total Izin: {totalIzin} kali</p>
                      <p>🤒 Sakit: {student.attendance.sakit} kali</p>
                      <p>🗓️ Izin: {student.attendance.izin} kali</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col items-stretch gap-2 bg-slate-50 p-4 rounded-b-xl">
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
