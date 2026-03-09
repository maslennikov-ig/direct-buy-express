'use client';

import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

export function LotAuditActions({ lotId }: { lotId: string }) {
    const [status, setStatus] = useState<'idle' | 'loading' | 'approved' | 'rejected'>('idle');
    const [loading, setLoading] = useState(false);

    const handleAction = async (action: 'approve' | 'reject') => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/lots/${lotId}/${action}`, {
                method: 'POST',
            });
            if (res.ok) {
                setStatus(action === 'approve' ? 'approved' : 'rejected');
            }
        } catch (error) {
            console.error(`${action} error:`, error);
        } finally {
            setLoading(false);
        }
    };

    if (status === 'approved') {
        return (
            <span className="text-emerald-500 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Документы одобрены
            </span>
        );
    }

    if (status === 'rejected') {
        return (
            <span className="text-red-500 font-medium flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Документы отклонены
            </span>
        );
    }

    return (
        <>
            <Button
                variant="ghost"
                className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                onClick={() => handleAction('reject')}
                disabled={loading}
            >
                <XCircle className="w-4 h-4 mr-2" />
                Отклонить
            </Button>
            <Button
                className="bg-emerald-600 text-white hover:bg-emerald-500"
                onClick={() => handleAction('approve')}
                disabled={loading}
            >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Одобрить
            </Button>
        </>
    );
}
