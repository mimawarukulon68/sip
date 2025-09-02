
"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { addDays, format, parseISO, subDays } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, Upload, ArrowLeft, Loader2, FileText, X, RefreshCw } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  parentLeaveId: z.string().optional(),
  previousLeaveId: z.string().optional(), // For late extension
});

type StudentData = {
    id: string;
    full_name: string;
    classes: {
        class_name: string;
    } | null;
} | null;

type PreviousLeave = {
    id: string;
    leave_type: 'Sakit' | 'Izin';
    start_date: string;
    end_date: string;
}

export default function LatePermissionFormPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get("studentId");
  const submissionType = searchParams.get("type") as 'new-late' | 'extend-late' | null;
  const { toast } = useToast();
  
  const [student, setStudent] = React.useState<StudentData>(null);
  const [loading, setLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);
  const [previousLeaves, setPreviousLeaves] = React.useState<PreviousLeave[]>([]);
  const [selectedPreviousLeave, setSelectedPreviousLeave] = React.useState<PreviousLeave | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: studentId || "",
      studentName: "",
      studentClass: "",
      reasonType: "Sakit",
      duration: "1",
      startDate: subDays(new Date(), 1), 
      reasonText: "",
    },
  });

  React.useEffect(() => {
    if (!studentId || !submissionType) {
        toast({ variant: "destructive", title: "Error", description: "Parameter tidak lengkap." });
        router.push("/dashboard/parent");
        return;
    }

    async function fetchInitialData() {
        setLoading(true);
        
        const { data: studentData, error: studentError } = await supabase
            .from("students")
            .select(`id, full_name, classes (class_name)`)
            .eq("id", studentId)
            .single();

        if (studentError || !studentData) {
            toast({ variant: "destructive", title: "Gagal memuat data", description: "Tidak dapat menemukan data siswa." });
            router.push("/dashboard/parent");
            return;
        }
        
        setStudent(studentData as StudentData);

        if (submissionType === 'extend-late') {
            const { data: leavesData, error: leavesError } = await supabase
                .from('leave_requests')
                .select('id, leave_type, start_date, end_date')
                .eq('student_id', studentId)
                .in('status', ['AKTIF', 'SELESAI'])
                .order('end_date', { ascending: false });

            if (leavesError) {
                toast({ variant: "destructive", title: "Gagal memuat data", description: "Tidak dapat memuat riwayat izin sebelumnya." });
            } else {
                setPreviousLeaves(leavesData || []);
            }
        }

        form.reset({
            studentId: studentData.id,
            studentName: studentData.full_name,
            studentClass: studentData.classes?.class_name || "Tidak ada kelas",
            reasonType: "Sakit",
            duration: "1",
            startDate: subDays(new Date(), 1),
            reasonText: "",
        });

        setLoading(false);
    }

    fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, submissionType, router, toast]);

  const watchDuration = form.watch("duration");
  const watchStartDate = form.watch("startDate");
  const watchPreviousLeaveId = form.watch("previousLeaveId");

  React.useEffect(() => {
    if (watchStartDate && watchDuration) {
      const durationDays = parseInt(watchDuration, 10);
      const endDate = addDays(watchStartDate, durationDays - 1);
      form.setValue("endDate", endDate);
    }
  }, [watchStartDate, watchDuration, form]);
  
  React.useEffect(() => {
    if(watchPreviousLeaveId && submissionType === 'extend-late') {
        const selected = previousLeaves.find(l => l.id === watchPreviousLeaveId) || null;
        setSelectedPreviousLeave(selected);
        if (selected) {
            form.setValue('reasonType', selected.leave_type);
            form.setValue('startDate', addDays(parseISO(selected.end_date), 1));
            form.setValue('parentLeaveId', selected.id);
        }
    }
  }, [watchPreviousLeaveId, submissionType, previousLeaves, form]);

  const handleDateSelect = (date: Date | undefined) => {
    if(!date) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    if(date >= today) {
        toast({
            variant: "destructive",
            title: "Tanggal Tidak Valid",
            description: "Untuk izin susulan, tanggal mulai harus di masa lalu."
        })
        return;
    }
    form.setValue("startDate", date);
    setIsPopoverOpen(false); 
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      const allFiles = [...uploadedFiles, ...newFiles];
      setUploadedFiles(allFiles);
      form.setValue("document", allFiles);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...uploadedFiles];
    newFiles.splice(index, 1);
    setUploadedFiles(newFiles);
    form.setValue("document", newFiles);
  };

  const whatsappMessage = React.useMemo(() => {
    const values = form.getValues();
    if (!values.studentName || !values.reasonType || !values.startDate || !values.endDate) {
      return "Mohon lengkapi formulir untuk melihat pratinjau pesan.";
    }

    const durationDays = parseInt(values.duration, 10);
    const startDateFormatted = format(values.startDate, "EEEE, d MMMM yyyy", { locale: id });
    const messageAction = submissionType === 'extend-late' ? "memperpanjang izin (susulan)" : "memberitahukan bahwa ananda tidak masuk sekolah";

    let message: string;

    if(durationDays === 1){
         message = `Assalamu'alaikum Wr. Wb.\n\nYth. Bapak/Ibu Wali Kelas ${values.studentClass}\n\nDengan ini kami ${messageAction} pada hari ${startDateFormatted} dikarenakan ${values.reasonType.toLowerCase()}.`;
    } else {
        const endDateFormatted = format(values.endDate, "EEEE, d MMMM yyyy", { locale: id });
        message = `Assalamu'alaikum Wr. Wb.\n\nYth. Bapak/Ibu Wali Kelas ${values.studentClass}\n\nDengan ini kami ${messageAction} selama ${durationDays} hari, dari tanggal ${startDateFormatted} s.d. ${endDateFormatted} dikarenakan ${values.reasonType.toLowerCase()}.`;
    }
    
    if(values.reasonText) {
        message += `\nKeterangan: ${values.reasonText}`;
    }

    message += `\n\nMohon maaf atas keterlambatan pemberitahuan ini. Atas perhatian Bapak/Ibu Guru, kami ucapkan terima kasih.\nWassalamu'alaikum Wr. Wb.`;

    return message;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.watch(), submissionType]);


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
             toast({ variant: "destructive", title: "Gagal Mengunggah", description: "Nama kelas siswa tidak ditemukan." });
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
        document_url: documentUrl,
        parent_leave_id: values.parentLeaveId || null
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

  const isExtension = submissionType === 'extend-late';

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
            <h1 className="text-lg font-semibold text-gray-900">
                Formulir Izin Susulan
            </h1>
          </div>
        </div>
      </header>
      <main className="flex flex-1 w-full items-start justify-center bg-muted/20 p-4 md:p-8">
        <Card className="w-full max-w-3xl shadow-lg rounded-xl mt-0">
          <CardHeader>
            <CardTitle className="text-2xl">{isExtension ? 'Perpanjangan Izin (Susulan)' : 'Izin Baru (Susulan)'}</CardTitle>
            <CardDescription>
                {isExtension 
                    ? `Pilih izin sebelumnya untuk diperpanjang. Tanggal mulai dan jenis izin akan disesuaikan secara otomatis.`
                    : 'Lengkapi formulir di bawah ini untuk mengajukan izin baru yang terlambat diajukan.'
                }
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

                {isExtension && (
                    <FormField
                      control={form.control}
                      name="previousLeaveId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pilih Izin Sebelumnya</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih izin yang ingin diperpanjang..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {previousLeaves.map(leave => (
                                    <SelectItem key={leave.id} value={leave.id}>
                                        {leave.leave_type} ({format(parseISO(leave.start_date), 'd MMM')} - {format(parseISO(leave.end_date), 'd MMM yyyy')})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                )}

                <FormField
                  control={form.control}
                  name="reasonType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Jenis Izin</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-6"
                          disabled={isExtension}
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Sakit" disabled={isExtension} />
                            </FormControl>
                            <FormLabel className={cn("font-normal", isExtension && "text-muted-foreground")}>Sakit</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Izin" disabled={isExtension} />
                            </FormControl>
                            <FormLabel className={cn("font-normal", isExtension && "text-muted-foreground")}>Izin</FormLabel>
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
                      <FormLabel>Durasi</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex items-center space-x-6"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="1" /></FormControl>
                            <FormLabel className="font-normal">1 Hari</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="2" /></FormControl>
                            <FormLabel className="font-normal">2 Hari</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="3" /></FormControl>
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
                          <PopoverTrigger asChild disabled={isExtension}>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                  isExtension && "pointer-events-none bg-muted/50"
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
                              disabled={(date) => date >= new Date(new Date().setHours(0,0,0,0))}
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
                            className={cn("w-full justify-start text-left font-normal pointer-events-none bg-muted/50")}
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
                          placeholder={"Contoh: Ada acara keluarga mendadak di luar kota."}
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
                  render={() => (
                    <FormItem>
                      <FormLabel>Dokumen Pendukung (Opsional)</FormLabel>
                       <div className="mt-2">
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                            <input
                              type="file"
                              id="documents"
                              multiple
                              accept="image/*,.pdf"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                            <label htmlFor="documents" className="cursor-pointer">
                              <Upload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-gray-400" />
                              <p className="text-xs sm:text-sm text-gray-600">
                                Klik untuk mengunggah foto atau dokumen
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Format: JPG, PNG, PDF (Maks. 5MB)
                              </p>
                            </label>
                          </div>

                          {uploadedFiles.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {uploadedFiles.map((file, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs sm:text-sm"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                                    <span className="text-gray-700 truncate">
                                      {file.name}
                                    </span>
                                    <span className="text-gray-500 flex-shrink-0">
                                      ({(file.size / 1024 / 1024).toFixed(1)} MB)
                                    </span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile(index)}
                                    className="flex-shrink-0 h-6 w-6 p-0"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
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
                   ) : 'Kirim Pemberitahuan Susulan'
                   }
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

    