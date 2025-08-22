
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
import { PlusCircle, RefreshCw, Check, X } from "lucide-react";

// Mock data for students, this would typically come from an API
const students = [
  {
    id: 1,
    name: "Ahmad Budi",
    class: "Kelas 4",
    permissionStatus: null,
    totalPermissions: 2,
  },
  {
    id: 2,
    name: "Citra Dewi",
    class: "Kelas 2",
    permissionStatus: {
      status: "Sakit",
      endDate: "2024-08-25",
      color: "yellow",
    },
    totalPermissions: 1,
  },
   {
    id: 3,
    name: "Eka Fitri",
    class: "Kelas 6",
    permissionStatus: {
      status: "Izin",
      endDate: "2024-08-24",
      color: "red",
    },
    totalPermissions: 3,
  },
];

export default function DashboardPage() {
  const parentName = "John Doe"; // This would be dynamic based on logged in user

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">
            Selamat Datang Bapak/Ibu Wali Murid {parentName}
          </h1>
          <p className="text-muted-foreground">
            Kelola perizinan dan pantau ringkasan absensi putra/putri Anda di
            sini.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <Card key={student.id}>
              <CardHeader>
                <CardTitle>{student.name}</CardTitle>
                <CardDescription>{student.class}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Status Izin Saat Ini</h4>
                  {student.permissionStatus ? (
                     <Badge 
                      className={`bg-${student.permissionStatus.color}-100 text-${student.permissionStatus.color}-800 border-${student.permissionStatus.color}-200`}
                      variant="outline"
                    >
                      {student.permissionStatus.status} hingga {new Date(student.permissionStatus.endDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                      Aktif Masuk
                    </Badge>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Ringkasan Absensi</h4>
                  <p className="text-sm text-muted-foreground">
                    Total Izin: {student.totalPermissions} kali
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                {student.permissionStatus ? (
                  <>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Perpanjang
                    </Button>
                    <Button variant="outline" size="sm">
                       <Check className="mr-2 h-4 w-4" />
                      Sudah Masuk
                    </Button>
                     <Button variant="destructive" size="sm">
                      <X className="mr-2 h-4 w-4" />
                      Batalkan
                    </Button>
                  </>
                ) : (
                  <Link href={`/dashboard/izin?studentId=${student.id}`}>
                    <Button size="sm">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Ajukan Izin
                    </Button>
                  </Link>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

// Helper to get color for badge based on status
const getBadgeColor = (status: string | null) => {
  if (!status) return 'green';
  if (status.toLowerCase() === 'sakit') return 'yellow';
  if (status.toLowerCase() === 'izin') return 'red';
  return 'gray';
}
