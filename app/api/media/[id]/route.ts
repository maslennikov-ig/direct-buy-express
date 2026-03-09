import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAuthenticated } from '@/lib/admin-auth';
import fs from 'fs';
import path from 'path';

const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!await isAuthenticated()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const media = await prisma.media.findUnique({
            where: { id },
        });

        if (!media) {
            return NextResponse.json({ error: 'Media not found' }, { status: 404 });
        }

        // media.url is like "/uploads/lots/{lotId}/filename.ext"
        const filePath = path.resolve(process.cwd(), media.url.replace(/^\//, ''));

        // CR-2 fix: Prevent path traversal — ensure resolved path is inside uploads/
        if (!filePath.startsWith(UPLOADS_ROOT)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();

        const mimeTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.pdf': 'application/pdf',
            '.webp': 'image/webp',
        };

        const contentType = mimeTypes[ext] || 'application/octet-stream';

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `inline; filename="${path.basename(filePath)}"`,
                'Cache-Control': 'private, max-age=3600',
            },
        });
    } catch (error) {
        console.error('Error serving media:', error);
        return NextResponse.json(
            { error: 'Internal error' },
            { status: 500 }
        );
    }
}
