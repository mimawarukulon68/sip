
"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { addDays, format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, Upload, ArrowLeft } from "lucide-react";

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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Mock data for students
const students = [
  { id: 1, name: "Ahmad Budi", class: "Kelas 4" },
  { id: 2, name: "Citra Dewi", class: "Kelas 2" },
  { id: 3, name: "Eka Fitri", class: "Kelas 6" },
];

const formSchema = z.object({
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

export default function PermissionFormPage() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId");
  const student = students.find((s) => s.id === Number(studentId));
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentName: student?.name || "",
      studentClass: student?.class || "",
      reasonType: "Sakit",
      duration: "1",
      startDate: new Date(),
      reasonText: "",
    },
  });

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
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    if(date < today) {
        toast({
            variant: "destructive",
            title: "Tanggal Tidak Valid",
            description: "Tanggal yang Anda pilih berada di masa lalu. Silakan gunakan tombol 'Ajukan Izin Susulan' di dasbor Anda untuk pengajuan izin yang sudah terjadi."
        })
        return;
    }
    form.setValue("startDate", date);
  }

  const whatsappMessage = React.useMemo(() => {
    const values = form.getValues();
    if (!values.studentName || !values.reasonType || !values.startDate || !values.endDate) {
      return "Mohon lengkapi formulir untuk melihat pratinjau pesan.";
    }

    const durationDays = parseInt(values.duration, 10);
    const startDateFormatted = format(values.startDate, "d MMMM yyyy", { locale: id });

    let message: string;

    if(durationDays === 1){
         message = `Assalamu'alaikum Wr. Wb.\n\nYth. Bapak/Ibu Wali Kelas ${values.studentClass}\n\nDengan ini kami beritahukan bahwa ananda ${values.studentName} tidak dapat masuk sekolah selama 1 hari, hari ini tanggal ${startDateFormatted} dikarenakan ${values.reasonType.toLowerCase()}.`;
    } else {
        const endDateFormatted = format(values.endDate, "d MMM yyyy", { locale: id });
        const startDateShort = format(values.startDate, "d MMM", { locale: id });
        message = `Assalamu'alaikum Wr. Wb.\n\nYth. Bapak/Ibu Wali Kelas ${values.studentClass}\n\nDengan ini kami beritahukan bahwa ananda ${values.studentName} tidak dapat masuk sekolah selama ${durationDays} hari, dari tanggal ${startDateShort} s.d. ${endDateFormatted} dikarenakan ${values.reasonType.toLowerCase()}.`;
    }
    
    if(values.reasonText) {
        message += `\nKeterangan: ${values.reasonText}`;
    }

    message += `\n\nAtas perhatian Bapak/Ibu Guru, kami ucapkan terima kasih.\nWassalamu'alaikum Wr. Wb.`;

    return message;
  }, [form.watch()]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    // Logic to send notification
    toast({
        title: "Pemberitahuan Terkirim",
        description: "Formulir izin Anda telah berhasil dikirimkan."
    })
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Siswa tidak ditemukan. Harap kembali ke dasbor dan coba lagi.</p>
      </div>
    );
  }

  return (
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
                        <Popover>
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
                                  format(field.value, "d MMMM yyyy", { locale: id })
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
                              "w-full justify-start text-left font-normal bg-muted/50",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "d MMMM yyyy", { locale: id })
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
                            <Input type="file" {...form.register("document")} className="pl-10"/>
                          </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full text-base font-semibold py-6">
                  Kirim Pemberitahuan
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
  );
}
