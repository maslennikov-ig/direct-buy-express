'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2 } from 'lucide-react';
import type { TelegramAuthData } from '@/lib/telegram-auth';

export default function AdminLoginPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Define global callback for Telegram Widget
        (window as any).onTelegramAuth = async (user: TelegramAuthData) => {
            setLoading(true);
            setError('');
            
            try {
                const res = await fetch('/api/admin/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(user),
                });

                if (res.ok) {
                    window.location.href = '/admin';
                } else {
                    const data = await res.json();
                    setError(data.error || 'Ошибка авторизации');
                }
            } catch {
                setError('Ошибка соединения со сервером');
            } finally {
                setLoading(false);
            }
        };

        const botName = process.env.NEXT_PUBLIC_BOT_USERNAME;
        if (!botName) {
            setError('Ошибка: переменная NEXT_PUBLIC_BOT_USERNAME не настроена');
            return;
        }

        // Inject the script into the container securely
        if (containerRef.current && containerRef.current.children.length === 0) {
            const script = document.createElement('script');
            script.src = 'https://telegram.org/js/telegram-widget.js?22';
            script.setAttribute('data-telegram-login', botName);
            script.setAttribute('data-size', 'large');
            script.setAttribute('data-radius', '10');
            script.setAttribute('data-request-access', 'write');
            script.setAttribute('data-onauth', 'onTelegramAuth(user)');
            script.async = true;
            containerRef.current.appendChild(script);
        }
    }, []);

    return (
        <div className="h-full bg-zinc-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl mb-6 shadow-xl">
                        <Building2 className="w-10 h-10 text-black" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Direct Buy</h1>
                    <p className="text-zinc-400 mt-3 text-lg">Панель управления</p>
                </div>

                <div className="bg-black border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center space-y-4 shadow-2xl">
                    <p className="text-zinc-400 text-sm text-center mb-2">
                        Авторизуйтесь через свой Telegram аккаунт
                    </p>
                    
                    {loading ? (
                        <div className="text-white bg-white/10 px-6 py-3 rounded-lg animate-pulse w-full text-center">
                            Вход...
                        </div>
                    ) : (
                        <div ref={containerRef} className="flex justify-center min-h-[40px] min-w-[200px]" />
                    )}

                    {error && (
                        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mt-4 text-center w-full">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
