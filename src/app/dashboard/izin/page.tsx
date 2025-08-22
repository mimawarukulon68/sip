
"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { addDays, format } from "date-fns";
import { CalendarIcon, Upload } from "lucide-react";

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
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentName: student?.name || "",
      studentClass: student?.class || "",
      startDate: new Date(),
      reasonText: "",
    },
  });

  const watchDuration = form.watch("duration");
  const watchStartDate = form.watch("startDate");

  React.useEffect(() => {
    if (watchStartDate && watchDuration) {
      const endDate = addDays(watchStartDate, parseInt(watchDuration) - 1);
      form.setValue("endDate", endDate);
    }
  }, [watchStartDate, watchDuration, form]);

  const whatsappMessage = React.useMemo(() => {
    const values = form.getValues();
    if (!values.studentName || !values.reasonType || !values.startDate || !values.endDate) {
      return "Mohon lengkapi formulir untuk melihat pratinjau pesan.";
    }
    const startDateFormatted = format(values.startDate, "d MMMM yyyy");
    const endDateFormatted = format(values.endDate, "d MMMM yyyy");
    const duration = values.duration === "1" ? "" : `selama ${values.duration} hari, `;
    const dateRange = startDateFormatted === endDateFormatted
        ? `pada tanggal ${startDateFormatted}`
        : `dari tanggal ${startDateFormatted} sampai ${endDateFormatted}`;
        
    let message = `Assalamu'alaikum Wr. Wb.\nDengan hormat, saya selaku orang tua/wali murid dari:\n\nNama: *${values.studentName}*\nKelas: *${values.studentClass}*\n\nMemberitahukan bahwa anak saya tidak dapat mengikuti kegiatan belajar mengajar ${dateRange} dikarenakan *${values.reasonType.toLowerCase()}*.`;
    
    if(values.reasonText) {
        message += `\n\nKeterangan: ${values.reasonText}`;
    }

    message += `\n\nDemikian surat pemberitahuan ini saya sampaikan. Atas perhatian Bapak/Ibu guru, saya ucapkan terima kasih.\nWassalamu'alaikum Wr. Wb.`;

    return message;
  }, [form.watch()]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    // Logic to send notification
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Siswa tidak ditemukan. Harap kembali ke dasbor dan coba lagi.</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Formulir Pemberitahuan Perizinan Siswa</CardTitle>
          <CardDescription>
            Lengkapi formulir di bawah ini untuk mengajukan izin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="studentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Siswa</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly className="bg-muted"/>
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
                        <Input {...field} readOnly className="bg-muted"/>
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
                    <FormLabel>Alasan Izin</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
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
                          <FormLabel className="font-normal">Izin (keperluan keluarga, dll)</FormLabel>
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
                        className="flex items-center space-x-4"
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

              <div className="grid grid-cols-2 gap-4">
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
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pilih tanggal</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
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
                    <FormItem>
                      <FormLabel>Tanggal Selesai</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value ? format(field.value, "PPP") : ""}
                          readOnly
                          className="bg-muted"
                        />
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

              <Button type="submit" className="w-full">
                Kirim Pemberitahuan
              </Button>
            </form>
          </Form>

           <div className="mt-8 pt-6 border-t">
              <h3 className="text-lg font-semibold mb-2">Pratinjau Pesan WhatsApp</h3>
              <Card className="bg-muted">
                <CardContent className="p-4 whitespace-pre-wrap text-sm">
                    {whatsappMessage}
                </CardContent>
              </Card>
           </div>
        </CardContent>
      </Card>
    </main>
  );
}
