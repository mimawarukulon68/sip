import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Dasbor</CardTitle>
            <CardDescription>
              Selamat datang di Sistem Informasi Perizinan Siswa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Halaman ini akan menampilkan informasi yang relevan berdasarkan
              peran Anda.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
