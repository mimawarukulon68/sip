
"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { addDays, format, subDays } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, Upload, ArrowLeft, Loader2 } from "lucide-react";
import { format as formatDate } from "date-fns-tz";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-client";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  studentClass: z.string(),
  reasonType: z.enum(["Sakit", "Izin"], {
    required_error: "Anda harus memilih tipe izin.",
  }),
  duration: z.enum(["1", "2", "3"], {
    required_error: "Anda harus memilih durasi.",
  }),
  startDate: z.date({
    required_error: "Tanggal mulai harus diisi.",
  }),
  endDate: z.date().optional(),
  reasonText: z.string().optional(),
  document: z.any().optional(),
});

type StudentData = {
    id: string;
    full_name: string;
    classes: {
        class_name: string;
    } | null;
} | null;

type LeaveRequest = {
  id: string;
  leave_type: 'Sakit' | 'Izin';
  start_date: string;
  end_date: string;
};


export default function PermissionFormPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get("studentId");
  const { toast } = useToast();
  const [student, setStudent] = React.useState<StudentData>(null);
  const [loading, setLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  
  const [extendableLeave, setExtendableLeave] = React.useState<LeaveRequest | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: studentId || "",
      studentName: "",
      studentClass: "",
      reasonType: "Sakit",
      duration: "1",
      startDate: undefined, 
      reasonText: "",
    },
  });

  React.useEffect(() => {
    if (!studentId) {
        toast({ variant: "destructive", title: "Error", description: "ID Siswa tidak ditemukan." });
        router.push("/dashboard");
        return;
    }

    async function fetchStudentData() {
        setLoading(true);
        
        const studentPromise = supabase
            .from("students")
            .select(`id, full_name, classes (class_name)`)
            .eq("id", studentId)
            .single();
        
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
        const leavePromise = supabase
            .from('leave_requests')
            .select('id, leave_type, start_date, end_date')
            .eq('student_id', studentId)
            .eq('end_date', yesterday)
            .eq('status', 'SELESAI')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        const [{ data: studentData, error: studentError }, { data: leaveData, error: leaveError }] = await Promise.all([
          studentPromise, 
          leavePromise
        ]);

        if (studentError || !studentData) {
            toast({ variant: "destructive", title: "Gagal memuat data", description: "Tidak dapat menemukan data siswa." });
            router.push("/dashboard");
            return;
        }

        setStudent(studentData as StudentData);
        form.reset({
            studentId: studentData.id,
            studentName: studentData.full_name,
            studentClass: studentData.classes?.class_name || "Tidak ada kelas",
            reasonType: "Sakit",
            duration: "1",
            startDate: new Date(),
            reasonText: "",
        });
        
        if (leaveData) {
            setExtendableLeave(leaveData as LeaveRequest);
        }

        setLoading(false);
    }

    fetchStudentData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, router, toast]);


  const watchDuration = form.watch("duration");
  const watchStartDate = form.watch("startDate");

  React.useEffect(() => {
    if (watchStartDate && watchDuration) {
      const durationDays = parseInt(watchDuration, 10);
      const endDate = addDays(watchStartDate, durationDays - 1);
      form.setValue("endDate", endDate);
    }
  }, [watchStartDate, watchDuration, form]);
  
  const handleDateSelect = (date: Date | undefined) => {
    if(!date) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    if(date < today) {
        toast({
            variant: "destructive",
            title: "Tanggal Tidak Valid",
            description: "Tanggal yang Anda pilih berada di masa lalu. Silakan gunakan tombol 'Ajukan Izin Susulan' di dasbor Anda untuk pengajuan izin yang sudah terjadi."
        })
        return;
    }
    form.setValue("startDate", date);
    setIsPopoverOpen(false); 
  }

  const whatsappMessage = React.useMemo(() => {
    const values = form.getValues();
    if (!values.studentName || !values.reasonType || !values.startDate || !values.endDate) {
      return "Mohon lengkapi formulir untuk melihat pratinjau pesan.";
    }

    const durationDays = parseInt(values.duration, 10);
    const startDateFormatted = format(values.startDate, "EEEE, d MMMM yyyy", { locale: id });

    let message: string;

    if(durationDays === 1){
         message = `Assalamu'alaikum Wr. Wb.\n\nYth. Bapak/Ibu Wali Kelas ${values.studentClass}\n\nDengan ini kami beritahukan bahwa ananda ${values.studentName} tidak dapat masuk sekolah pada hari ini, ${startDateFormatted} dikarenakan ${values.reasonType.toLowerCase()}.`;
    } else {
        const endDateFormatted = format(values.endDate, "EEEE, d MMMM yyyy", { locale: id });
        message = `Assalamu'alaikum Wr. Wb.\n\nYth. Bapak/Ibu Wali Kelas ${values.studentClass}\n\nDengan ini kami beritahukan bahwa ananda ${values.studentName} tidak dapat masuk sekolah selama ${durationDays} hari, dari tanggal ${startDateFormatted} s.d. ${endDateFormatted} dikarenakan ${values.reasonType.toLowerCase()}.`;
    }
    
    if(values.reasonText) {
        message += `\nKeterangan: ${values.reasonText}`;
    }

    message += `\n\nAtas perhatian Bapak/Ibu Guru, kami ucapkan terima kasih.\nWassalamu'alaikum Wr. Wb.`;

    return message;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.watch()]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Anda harus login untuk mengajukan izin." });
        setIsSubmitting(false);
        return;
    }

    let documentUrl: string | null = null;
    const file = values.document?.[0];

    if (file) {
        if (!student?.classes?.class_name) {
             toast({ variant: "destructive", title: "Gagal Mengunggah", description: "Nama kelas siswa tidak ditemukan. Tidak dapat mengunggah dokumen." });
             setIsSubmitting(false);
             return;
        }

        const now = new Date();
        const dateStr = formatDate(now, "ddMMyy", { timeZone: "Asia/Jakarta" });
        const timeStr = formatDate(now, "HHmmss", { timeZone: "Asia/Jakarta" });
        const studentNameSanitized = values.studentName.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${dateStr}-${timeStr}-${studentNameSanitized}.${file.name.split('.').pop()}`;
        const filePath = `${student.classes.class_name}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('dokumen_izin')
            .upload(filePath, file);

        if (uploadError) {
            toast({ variant: "destructive", title: "Gagal Mengunggah", description: `Gagal mengunggah dokumen: ${uploadError.message}` });
            setIsSubmitting(false);
            return;
        }
        
        const { data: publicUrlData } = supabase.storage.from('dokumen_izin').getPublicUrl(filePath);
        documentUrl = publicUrlData.publicUrl;
    }


    const { data: leaveRequestData, error } = await supabase.from('leave_requests').insert({
        created_by_user_id: user.id,
        student_id: values.studentId,
        leave_type: values.reasonType,
        reason: values.reasonText,
        start_date: format(values.startDate, "yyyy-MM-dd"),
        end_date: format(values.endDate || values.startDate, "yyyy-MM-dd"),
        status: 'AKTIF',
        document_url: documentUrl
    }).select().single();

    setIsSubmitting(false);

    if (error) {
        toast({ variant: "destructive", title: "Gagal Mengirim", description: error.message });
    } else if (leaveRequestData) {
        router.push(`/dashboard/izin/sukses?id=${leaveRequestData.id}`);
    }
  }

  if (loading) {
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/10">
            <header className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center h-14 sm:h-16">
                         <Skeleton className="h-10 w-10 mr-4" />
                         <Skeleton className="h-6 w-48" />
                    </div>
                </div>
            </header>
            <main className="flex flex-1 w-full items-start justify-center bg-muted/20 p-4 md:p-8">
                <Card className="w-full max-w-3xl shadow-lg rounded-xl mt-0">
                    <CardHeader>
                        <Skeleton className="h-8 w-64 mb-2" />
                        <Skeleton className="h-4 w-full" />
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-16 w-full" />
                         <Skeleton className="h-12 w-full" />
                    </CardContent>
                </Card>
            </main>
        </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Siswa tidak ditemukan atau Anda tidak memiliki akses.</p>
        <Link href="/dashboard" className="ml-2 underline">Kembali</Link>
      </div>
    );
  }

  const documentRef = form.register("document");

  return (
    <>
    <AlertDialog open={!!extendableLeave} onOpenChange={(open) => !open && setExtendableLeave(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Izin Baru Saja Berakhir?</AlertDialogTitle>
                <AlertDialogDescription>
                    Kami melihat izin <strong>{extendableLeave?.leave_type}</strong> untuk <strong>{student.full_name}</strong> baru saja berakhir kemarin. Apakah Anda ingin memperpanjang izin tersebut?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setExtendableLeave(null)}>Buat Izin Baru</AlertDialogCancel>
                <AlertDialogAction onClick={() => router.push(`/dashboard/parent?extend=${extendableLeave?.id}&student=${student.id}`)}>
                    Ya, Perpanjang Izin
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <div className="flex min-h-screen w-full flex-col bg-muted/10">
       <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 sm:h-16">
            <Link href="/dashboard" className="mr-4">
               <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                  <span className="sr-only">Kembali</span>
                </Button>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">Formulir Perizinan Siswa</h1>
          </div>
        </div>
      </header>
      <main className="flex flex-1 w-full items-start justify-center bg-muted/20 p-4 md:p-8">
        <Card className="w-full max-w-3xl shadow-lg rounded-xl mt-0">
          <CardHeader>
            <CardTitle className="text-2xl">Detail Pengajuan Izin</CardTitle>
            <CardDescription>
              Lengkapi formulir di bawah ini untuk mengajukan izin reguler.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="studentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Siswa</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly className="bg-muted/50"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="studentClass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kelas</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly className="bg-muted/50"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reasonType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Jenis Izin</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-6"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Sakit" />
                            </FormControl>
                            <FormLabel className="font-normal">Sakit</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Izin" />
                            </FormControl>
                            <FormLabel className="font-normal">Izin</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Durasi Izin</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex items-center space-x-6"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="1" />
                            </FormControl>
                            <FormLabel className="font-normal">1 Hari</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="2" />
                            </FormControl>
                            <FormLabel className="font-normal">2 Hari</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="3" />
                            </FormControl>
                            <FormLabel className="font-normal">3 Hari</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tanggal Mulai</FormLabel>
                        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(field.value, "EEEE, d MMMM yyyy", { locale: id })
                                ) : (
                                  <span>Pilih tanggal</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={handleDateSelect}
                              disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tanggal Selesai</FormLabel>
                        <FormControl>
                           <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal pointer-events-none bg-background"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "EEEE, d MMMM yyyy", { locale: id })
                            ) : (
                              <span>Otomatis terisi</span>
                            )}
                          </Button>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reasonText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alasan/Keterangan (Opsional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Contoh: Ada acara keluarga di luar kota."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unggah Dokumen Pendukung (Opsional)</FormLabel>
                      <FormDescription>
                        Contoh: Surat keterangan dokter.
                      </FormDescription>
                      <FormControl>
                          <div className="relative">
                            <Upload className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input type="file" {...documentRef} className="pl-10"/>
                          </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full text-base font-semibold py-6" disabled={isSubmitting}>
                   {isSubmitting ? (
                       <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Mengirim...
                       </>
                   ) : 'Kirim Pemberitahuan'}
                </Button>
              </form>
            </Form>

            <div className="mt-8 pt-6 border-t">
              <h3 className="text-lg font-semibold mb-4">Pratinjau Pesan WhatsApp</h3>
              <Card className="bg-muted/50">
                <CardContent className="p-4 whitespace-pre-wrap text-sm font-mono leading-relaxed">
                    {whatsappMessage}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
    </>
  );
}

