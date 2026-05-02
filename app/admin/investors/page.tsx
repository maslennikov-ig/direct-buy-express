import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Clock, Users } from "lucide-react";
import { VerifyButton } from "./verify-button";
import { prisma } from "@/lib/db";
import { connection } from "next/server";

export default async function AdminInvestorsPage() {
  await connection();

  // Fetch investors from DB, explicitly filtering by verification status
  const unverified = await prisma.investorProfile.findMany({
    where: { isVerified: false },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 100, // Safe fetch limit
  });

  const verified = await prisma.investorProfile.findMany({
    where: { isVerified: true },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const formatBudget = (min: any, max: any) => {
    const fmt = (n: any) => n ? Number(n).toLocaleString('ru-RU') : '?';
    if (!min && !max) return 'Не указан';
    if (!max) return `от ${fmt(min)} ₽`;
    if (!min) return `до ${fmt(max)} ₽`;
    return `${fmt(min)} — ${fmt(max)} ₽`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Инвесторы (Модерация)</h2>
          <p className="text-white/50">Управление базой инвесторов и их верификацией.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {unverified.length} на проверке
          </Badge>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {verified.length} верифицированы
          </Badge>
        </div>
      </div>

      {/* Unverified Investors */}
      <Card className="bg-black border-white/10">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold">Ожидают верификации</h3>
          </div>
        </CardHeader>
        <CardContent>
          {unverified.length === 0 ? (
            <p className="text-white/40 text-sm py-2">Новых заявок нет.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead className="text-white/50">Telegram ID</TableHead>
                  <TableHead className="text-white/50">Имя</TableHead>
                  <TableHead className="text-white/50">Телефон</TableHead>
                  <TableHead className="text-white/50">Бюджет</TableHead>
                  <TableHead className="text-white/50">Районы</TableHead>
                  <TableHead className="text-white/50">Дата рег.</TableHead>
                  <TableHead className="text-white/50 text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unverified.map((inv) => (
                  <TableRow key={inv.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-mono text-blue-400">{inv.user.telegramId.toString()}</TableCell>
                    <TableCell>{inv.user.fullName || '—'}</TableCell>
                    <TableCell className="text-white/70">{inv.user.phone || '—'}</TableCell>
                    <TableCell className="font-mono text-sm">{formatBudget(inv.minBudget, inv.maxBudget)}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-sm">{inv.districts.join(', ') || '—'}</TableCell>
                    <TableCell className="text-white/50">
                      {inv.createdAt.toLocaleDateString('ru-RU')}
                    </TableCell>
                    <TableCell className="text-right">
                      <VerifyButton profileId={inv.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Verified Investors */}
      <Card className="bg-black border-white/10">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-semibold">Верифицированные инвесторы</h3>
          </div>
        </CardHeader>
        <CardContent>
          {verified.length === 0 ? (
            <p className="text-white/40 text-sm py-2">Верифицированных инвесторов пока нет.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead className="text-white/50">Telegram ID</TableHead>
                  <TableHead className="text-white/50">Имя</TableHead>
                  <TableHead className="text-white/50">Бюджет</TableHead>
                  <TableHead className="text-white/50">Районы</TableHead>
                  <TableHead className="text-white/50">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verified.map((inv) => (
                  <TableRow key={inv.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-mono text-blue-400">{inv.user.telegramId.toString()}</TableCell>
                    <TableCell>{inv.user.fullName || '—'}</TableCell>
                    <TableCell className="font-mono text-sm">{formatBudget(inv.minBudget, inv.maxBudget)}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-sm">{inv.districts.join(', ') || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10 flex w-fit items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Активен
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
