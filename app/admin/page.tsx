import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Activity, CheckCircle2, Users, FileText } from "lucide-react";
import { prisma } from "@/lib/db";

export default async function AdminDashboard() {
  // Real DB queries
  const [activeAuctions, docsAuditCount, pendingInvestorsCount, waitingDocsLots] = await Promise.all([
    prisma.lot.count({ where: { status: 'AUCTION' } }),
    prisma.lot.count({ where: { status: 'DOCS_AUDIT' } }),
    prisma.investorProfile.count({ where: { isVerified: false } }),
    prisma.lot.findMany({
      where: { status: 'WAITING_DOCS' },
      include: { owner: { select: { fullName: true, phone: true } } },
      orderBy: { auctionEndsAt: 'asc' },
      take: 10,
    }),
  ]);

  const kpis = [
    { title: "Активных аукционов", value: String(activeAuctions), icon: Activity, color: "text-blue-500" },
    { title: "На аудите документов", value: String(docsAuditCount), icon: FileText, color: "text-purple-500" },
    { title: "Ждут проверки (Инвесторы)", value: String(pendingInvestorsCount), icon: Users, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Обзор</h2>
        <p className="text-white/50">Ключевые показатели платформы за сегодня.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {kpis.map((kpi, i) => (
          <Card key={i} className="bg-black border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/70">
                {kpi.title}
              </CardTitle>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SLA Alerts — lots waiting for documents */}
      <Card className="bg-black border-white/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <CardTitle>Требуют внимания (SLA — ожидание документов)</CardTitle>
          </div>
          <p className="text-sm text-white/50">Лоты, ожидающие загрузки документов от собственника.</p>
        </CardHeader>
        <CardContent>
          {waitingDocsLots.length === 0 ? (
            <div className="flex items-center gap-2 text-white/40 py-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Все лоты в порядке, просрочек нет.</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead className="text-white/50">Адрес</TableHead>
                  <TableHead className="text-white/50">Собственник</TableHead>
                  <TableHead className="text-white/50">Телефон</TableHead>
                  <TableHead className="text-white/50 text-right">SLA до</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitingDocsLots.map((lot) => (
                  <TableRow key={lot.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium">{lot.address}</TableCell>
                    <TableCell className="text-white/70">{lot.owner?.fullName || 'Не указан'}</TableCell>
                    <TableCell className="text-white/50">{lot.owner?.phone || '—'}</TableCell>
                    <TableCell className="text-right font-mono text-red-500">
                      {lot.auctionEndsAt
                        ? new Date(lot.auctionEndsAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                        : '—'}
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
