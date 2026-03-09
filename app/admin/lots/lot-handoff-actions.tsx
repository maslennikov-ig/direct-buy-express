'use client';

import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, RotateCcw, AlertCircle } from "lucide-react";
import { useState } from "react";

export function LotHandoffActions({ lotId }: { lotId: string }) {
    const [status, setStatus] = useState<'idle' | 'loading' | 'completed' | 'canceled' | 'returned' | 'error'>('idle');
    const [loading, setLoading] = useState(false);

    const handleComplete = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/lots/${lotId}/complete`, {
                method: 'POST',
            });
            if (res.ok) {
                setStatus('completed');
            } else {
                setStatus('error');
            }
        } catch (error) {
            console.error('Complete error:', error);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (returnToAuction = false) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/lots/${lotId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ returnToAuction }),
            });
            if (res.ok) {
                setStatus(returnToAuction ? 'returned' : 'canceled');
            } else {
                setStatus('error');
            }
        } catch (error) {
            console.error('Cancel error:', error);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    if (status === 'completed') {
        return (
            <span className="text-emerald-500 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Сделка завершена
            </span>
        );
    }

    if (status === 'canceled') {
        return (
            <span className="text-red-500 font-medium flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Сделка отменена
            </span>
        );
    }

    if (status === 'returned') {
        return (
            <span className="text-blue-500 font-medium flex items-center gap-1">
                <RotateCcw className="w-4 h-4" /> Возвращён на аукцион
            </span>
        );
    }

    if (status === 'error') {
        return (
            <span className="text-red-500 font-medium flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Ошибка выполнения
            </span>
        );
    }

    return (
        <div className="flex gap-2">
            <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                onClick={() => handleCancel(false)}
                disabled={loading}
            >
                <XCircle className="w-4 h-4 mr-1" />
                Отменить
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                onClick={() => handleCancel(true)}
                disabled={loading}
            >
                <RotateCcw className="w-4 h-4 mr-1" />
                На аукцион
            </Button>
            <Button
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-500"
                onClick={handleComplete}
                disabled={loading}
            >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Сделка завершена
            </Button>
        </div>
    );
}
