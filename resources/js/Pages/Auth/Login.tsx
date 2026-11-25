import { zodResolver } from '@hookform/resolvers/zod';
import { Head, router } from '@inertiajs/react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const loginSchema = z.object({
    email: z.string().email('Enter a valid Krevia email address.'),
    password: z.string().min(1, 'Password is required.'),
    remember: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login({ errors: serverErrors = {} }: { errors?: Record<string, string> }) {
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
            remember: true,
        },
    });

    const onSubmit = (values: LoginFormValues) => {
        setSubmitting(true);
        router.post('/login', values, {
            onFinish: () => setSubmitting(false),
        });
    };

    return (
        <>
            <Head title="Sign In" />
            <div className="flex min-h-screen flex-col lg:flex-row">
                {/* Left Brand Panel (#101D35) */}
                <div className="flex flex-col justify-between bg-[#101D35] p-8 text-white lg:w-[44%] lg:p-12">
                    <div className="flex items-center gap-3">
                        <img
                            src="/images/krevia-mark.png"
                            alt="Krevia Digital"
                            className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain p-0.5 shadow-sm"
                        />
                        <div>
                            <p className="font-display text-base font-bold tracking-tight">Krevia Digital</p>
                            <p className="text-xs text-slate-300">Build Smarter. Operate Better.</p>
                        </div>
                    </div>

                    <div className="my-12 max-w-md space-y-5">
                        <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
                            Internal Business Management Platform · Dec 2026 – Dec 2027
                        </span>
                        <h1 className="font-display text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
                            Krevia Digital Management System
                        </h1>
                        <p className="text-sm leading-relaxed text-slate-300">
                            Unified internal operations for Website Development &amp; CMS and Custom Software
                            Development—connecting team accountability, workplan execution, client pipeline,
                            delivery governance, finance, and performance.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6 text-xs text-slate-300">
                        <div>
                            <p className="font-semibold text-white">7 Internal Members</p>
                            <p className="mt-0.5 text-slate-400">Role-based governance &amp; RACI</p>
                        </div>
                        <div>
                            <p className="font-semibold text-white">Pekanbaru, Riau</p>
                            <p className="mt-0.5 text-slate-400">Annual Workplan 2026–2027</p>
                        </div>
                    </div>
                </div>

                {/* Right Form Panel */}
                <div className="flex flex-1 items-center justify-center bg-[#F8FAFC] p-6 sm:p-12">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                        <div className="mb-6">
                            <h2 className="font-display text-xl font-bold text-[#101D35]">
                                Sign in to KDMS
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Use your Krevia Digital team account credentials.
                            </p>
                        </div>

                        {serverErrors.email && (
                            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                                {serverErrors.email}
                            </div>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="email"
                                        autoComplete="email"
                                        placeholder="name@kreviadigital.com"
                                        {...register('email')}
                                        className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pr-3 pl-9 text-sm text-slate-900 outline-none focus:border-[#101D35] focus:ring-2 focus:ring-[#101D35]/10"
                                    />
                                </div>
                                {errors.email && (
                                    <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        placeholder="Enter your password"
                                        {...register('password')}
                                        className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pr-10 pl-9 text-sm text-slate-900 outline-none focus:border-[#101D35] focus:ring-2 focus:ring-[#101D35]/10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        aria-label="Toggle password visibility"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>
                                )}
                            </div>

                            <label className="flex items-center gap-2 text-xs text-slate-600">
                                <input
                                    type="checkbox"
                                    {...register('remember')}
                                    className="h-4 w-4 rounded border-slate-300 text-[#101D35] focus:ring-[#101D35]"
                                />
                                Keep me signed in on this device
                            </label>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full rounded-lg bg-[#101D35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1A2D4E] disabled:opacity-60"
                            >
                                {submitting ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
