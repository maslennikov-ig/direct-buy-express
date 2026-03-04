import { Context, NextFunction } from 'grammy';
import { prisma } from '../../lib/db';

export async function authMiddleware(ctx: Context, next: NextFunction): Promise<void> {
    if (ctx.from) {
        const fullName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');

        await prisma.user.upsert({
            where: { telegramId: ctx.from.id },
            update: { fullName },
            create: {
                telegramId: ctx.from.id,
                fullName,
                role: 'OWNER', // Default role until they explicitly select one
            }
        });
    }

    await next();
}
