'use client';

import { Button } from "@/components/ui/button";
import { useState } from "react";

export function VerifyButton({ profileId }: { profileId: string }) {
    const [loading, setLoading] = useState(false);
    const [verified, setVerified] = useState(false);

    const handleVerify = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/investors/${profileId}/verify`, {
                method: 'POST',
            });
            if (res.ok) {
                setVerified(true);
            }
        } catch (error) {
            console.error('Verify error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (verified) {
        return (
            <span className="text-emerald-500 text-sm font-medium">✓ Верифицирован</span>
        );
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
            onClick={handleVerify}
            disabled={loading}
        >
            {loading ? 'Загрузка...' : 'Одобрить'}
        </Button>
    );
}
