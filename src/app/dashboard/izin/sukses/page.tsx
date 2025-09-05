
"use client";

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CircleCheckBig, MessageCircle, Share, Copy, ArrowLeft } from 'lucide-react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";

type LeaveRequestData = {
    id: string;
    leave_type: 'Sakit' | 'Izin';
    reason: string | null;
    start_date: string;
    end_date: string;
    students: {
        full_name: string;
        classes: {
            class_name: string;
        } | null;
    } | null;
} | null;

function SuccessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const leaveRequestId = searchParams.get('id');

    const [leaveRequest, setLeaveRequest] = useState<LeaveRequestData>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!leaveRequestId) {
            toast({
                variant: 'destructive',
                title: 'ID Izin Tidak Ditemukan',
                description: 'Tidak dapat memuat detail, mengarahkan kembali ke dasbor.',
            });
            router.replace('/dashboard');
            return;
        }

        async function fetchLeaveRequest() {
            setLoading(true);
            const { data, error } = await supabase
                .from('leave_requests')
                .select(`
                    id,
                    leave_type,
                    reason,
                    start_date,
                    end_date,
                    students (
                        full_name,
                        classes (
                            class_name
                        )
                    )
                `)
                .eq('id', leaveRequestId)
                .single();

            if (error || !data) {
                console.error("Error fetching leave request:", error);
                toast({
                    variant: 'destructive',
                    title: 'Gagal Memuat Data',
                    description: 'Tidak dapat menemukan detail izin yang baru saja dibuat.',
                });
                router.replace('/dashboard');
            } else {
                setLeaveRequest(data as LeaveRequestData);
            }
            setLoading(false);
        }

        fetchLeaveRequest();
    }, [leaveRequestId, router, toast]);
    
    const whatsappMessage = useMemo(() => {
        if (!leaveRequest || !leaveRequest.students) return "";

        const studentName = leaveRequest.students.full_name;
        const studentClass = leaveRequest.students.classes?.class_name || "kelasnya";
        const reasonType = leaveRequest.leave_type;
        const startDate = parseISO(leaveRequest.start_date);
        const endDate = parseISO(leaveRequest.end_date);
        const durationDays = differenceInCalendarDays(endDate, startDate) + 1;

        const startDateFormatted = format(startDate, "EEEE, d MMMM yyyy", { locale: id });
        
        let message: string;

        if (durationDays === 1) {
            message = `Assalamu'alaikum Wr. Wb.\n\nYth. Bapak/Ibu Wali Kelas ${studentClass}\n\nDengan ini kami beritahukan bahwa ananda ${studentName} tidak dapat masuk sekolah pada hari ini, ${startDateFormatted} dikarenakan ${reasonType.toLowerCase()}.`;
        } else {
            const endDateFormatted = format(endDate, "EEEE, d MMMM yyyy", { locale: id });
            message = `Assalamu'alaikum Wr. Wb.\n\nYth. Bapak/Ibu Wali Kelas ${studentClass}\n\nDengan ini kami beritahukan bahwa ananda ${studentName} tidak dapat masuk sekolah selama ${durationDays} hari, dari tanggal ${startDateFormatted} s.d. ${endDateFormatted} dikarenakan ${reasonType.toLowerCase()}.`;
        }
        
        if (leaveRequest.reason) {
            message += `\nKeterangan: ${leaveRequest.reason}`;
        }

        message += `\n\nAtas perhatian Bapak/Ibu Guru, kami ucapkan terima kasih.\nWassalamu'alaikum Wr. Wb.`;

        return message;
    }, [leaveRequest]);

    const handleCopyTemplate = () => {
        navigator.clipboard.writeText(whatsappMessage)
            .then(() => {
                toast({
                    title: 'Berhasil Disalin',
                    description: 'Template pesan WhatsApp telah disalin ke clipboard.',
                });
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
                toast({
                    variant: 'destructive',
                    title: 'Gagal Menyalin',
                    description: 'Tidak dapat menyalin template ke clipboard.',
                });
            });
    };

    const handleShareToWhatsApp = () => {
        const encodedMessage = encodeURIComponent(whatsappMessage);
        // This URL format opens WhatsApp and lets the user choose a contact or group.
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    };
    
    if (loading) {
        return (
            <Card className="w-full max-w-md shadow-lg rounded-xl">
                <CardHeader className="text-center p-6">
                    <div className="flex justify-center mb-4">
                        <Skeleton className="w-16 h-16 rounded-full" />
                    </div>
                    <Skeleton className="h-7 w-48 mx-auto" />
                    <Skeleton className="h-4 w-full max-w-xs mx-auto mt-2" />
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        );
    }
    
    if (!leaveRequest) {
        return null; // or a specific error component
    }

    const durationDays = differenceInCalendarDays(parseISO(leaveRequest.end_date), parseISO(leaveRequest.start_date)) + 1;

    return (
        <Card className="w-full max-w-md text-center shadow-lg rounded-xl">
            <CardHeader className="p-6">
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <CircleCheckBig className="w-8 h-8 text-green-600" />
                    </div>
                </div>
                <CardTitle className="text-xl">Pemberitahuan Terkirim!</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                    Pemberitahuan izin untuk {leaveRequest.students?.full_name || 'siswa'} berhasil dikirim dan dicatat dalam sistem.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 text-left border">
                    <h4 className="font-semibold text-sm mb-2 text-gray-800">Detail Pemberitahuan:</h4>
                    <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                        <div>• Jenis: {leaveRequest.leave_type}</div>
                        <div>• Tanggal: {format(parseISO(leaveRequest.start_date), "dd/M/yyyy", { locale: id })} ({durationDays} hari)</div>
                        {leaveRequest.reason && <div>• Alasan: {leaveRequest.reason}</div>}
                    </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-left">
                    <div className="flex items-center gap-2 text-green-800 text-sm">
                        <MessageCircle className="w-4 h-4" />
                        <span className="font-medium">Notifikasi WhatsApp Terkirim</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">Pemberitahuan otomatis (simulasi) telah dikirim ke Wali Kelas.</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
                    <div className="flex items-center gap-2 text-blue-800 text-sm mb-3">
                        <Share className="w-4 h-4" />
                        <span className="font-medium">Bagikan Template WhatsApp</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleShareToWhatsApp}>
                            <MessageCircle className="w-3 h-3 mr-1" />
                            Kirim ke Grup Kelas
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={handleCopyTemplate}>
                            <Copy className="w-3 h-3 mr-1" />
                            Salin Template
                        </Button>
                    </div>
                </div>

                <Link href="/dashboard" className="!mt-6 block">
                    <Button className="w-full">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali ke Dashboard
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}


export default function SuccessPage() {
    return (
        <main className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
             <Suspense fallback={
                <Card className="w-full max-w-md shadow-lg rounded-xl">
                    <CardHeader className="text-center p-6">
                        <div className="flex justify-center mb-4">
                            <Skeleton className="w-16 h-16 rounded-full" />
                        </div>
                        <Skeleton className="h-7 w-48 mx-auto" />
                        <Skeleton className="h-4 w-full max-w-xs mx-auto mt-2" />
                    </CardHeader>
                    <CardContent className="p-6 pt-0 space-y-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-28 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
             }>
                <SuccessContent />
             </Suspense>
        </main>
    )
}

