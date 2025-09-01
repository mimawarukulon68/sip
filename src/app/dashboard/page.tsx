
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { Skeleton } from "@/components/ui/skeleton";
import { FileSignature } from 'lucide-react';

type UserRole = 'admin' | 'teacher' | 'parent' | null;

export default function DashboardRedirectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUserAndRedirect() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          router.replace('/');
          return;
        }

        let role: UserRole = null;

        // 1. Check for admin
        const { data: adminProfile } = await supabase
          .from('admin_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (adminProfile) {
          role = 'admin';
        }

        // 2. Check for teacher
        if (!role) {
          const { data: teacherProfile } = await supabase
            .from('teacher_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();
          if (teacherProfile) {
            role = 'teacher';
          }
        }

        // 3. Check for parent
        if (!role) {
          const { data: parentProfile } = await supabase
            .from('parent_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();
          if (parentProfile) {
            role = 'parent';
          }
        }
        
        setLoading(false);

        if (role) {
          router.replace(`/dashboard/${role}`);
        } else {
          // Handle user with no profile
          console.error("User has no profile role assigned.");
          await supabase.auth.signOut();
          router.replace('/?error=no_role');
        }
      } catch (error) {
        console.error("Authentication error, redirecting to login:", error);
        router.replace('/');
      }
    }

    getUserAndRedirect();
  }, [router]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/10">
        <div className="flex flex-col items-center gap-4">
             <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center animate-pulse">
                <FileSignature className="w-8 h-8 text-primary-foreground" />
            </div>
            <p className="text-lg font-semibold text-muted-foreground">Mengarahkan ke dasbor Anda...</p>
            <div className="w-64 mt-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mt-2" />
            </div>
        </div>
    </div>
  );
}
