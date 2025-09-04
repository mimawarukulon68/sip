"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { School, Lock, User, Eye, EyeOff } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { isPhoneNumber } from "@/lib/phone-utils";
import { findEmailByPhoneNumber } from "@/lib/phone-lookup";

const formSchema = z.object({
  emailOrPhone: z.string().min(1, { message: "Email atau nomor telepon tidak boleh kosong." })
    .refine((value) => {
      // Check if it's a valid email or phone number
      const isEmail = z.string().email().safeParse(value).success;
      const isPhone = isPhoneNumber(value);
      return isEmail || isPhone;
    }, { message: "Masukkan email atau nomor telepon yang valid." }),
  password: z.string().min(1, { message: "Password tidak boleh kosong." }),
  remember: z.boolean().default(false).optional(),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = React.useState(false);
  const [loginError, setLoginError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      emailOrPhone: "",
      password: "",
      remember: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setLoginError(null);

    let emailToUse = values.emailOrPhone;

    // Check if input is phone number
    if (isPhoneNumber(values.emailOrPhone)) {
      try {
        const foundEmail = await findEmailByPhoneNumber(values.emailOrPhone);

        if (!foundEmail) {
          setIsLoading(false);
          setLoginError("Nomor telepon tidak terdaftar.");
          toast({
            variant: "destructive",
            title: "Login Gagal",
            description: "Nomor telepon tidak terdaftar dalam sistem.",
          });
          return;
        }

        emailToUse = foundEmail;
      } catch (lookupError) {
        setIsLoading(false);
        setLoginError("Terjadi kesalahan saat mencari data pengguna.");
        toast({
          variant: "destructive",
          title: "Login Gagal",
          description: "Terjadi kesalahan sistem. Silakan coba lagi.",
        });
        return;
      }
    }

    // Proceed with Supabase authentication using email with remember me option
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: values.password,
      options: {
        persistSession: values.remember, // Use remember me checkbox value
      }
    });

    setIsLoading(false);

    if (error) {
       setLoginError(error.message);
       toast({
        variant: "destructive",
        title: "Login Gagal",
        description: "Email/nomor telepon atau password yang Anda masukkan salah.",
      });
      return;
    }

    if (data.user) {
        toast({
            title: "Login Berhasil",
            description: "Anda akan diarahkan ke dasbor.",
        });
        router.push("/dashboard");
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg rounded-xl">
       <CardHeader className="text-center">
         <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full mb-4">
            <School className="h-12 w-12" />
         </div>
        <CardTitle className="text-2xl font-bold">SIPS MIRT</CardTitle>
        <CardDescription>
          Sistem Informasi Perizinan Siswa
          <br />
          MI Roudlotut Tholibin Warukulon
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             {loginError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Email atau password salah. Silakan coba lagi.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="emailOrPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email / Nomor Telepon</FormLabel>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <FormControl>
                        <Input
                          placeholder="Email atau nomor telepon"
                          {...field}
                          className="pl-10"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                     <FormLabel>Password</FormLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <FormControl>
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          {...field}
                          className="pl-10 pr-10"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                        <span className="sr-only">
                          {showPassword ? "Hide password" : "Show password"}
                        </span>
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <FormField
                control={form.control}
                name="remember"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="remember"
                      />
                    </FormControl>
                    <FormLabel htmlFor="remember" className="font-normal text-sm">
                      Ingat Saya
                    </FormLabel>
                  </FormItem>
                )}
              />
               <Link
                  href="#"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Lupa Password?
                </Link>
            </div>
            <Button type="submit" className="w-full text-base font-semibold py-6 bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? 'Memproses...' : 'Login'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
