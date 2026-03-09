import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, FileText, CheckCircle2, UserCheck, UserX, Phone, TrendingUp, XCircle, BarChart3 } from "lucide-react";
import { LotAuditActions } from "./lot-audit-actions";
import { LotHandoffActions } from "./lot-handoff-actions";
import { prisma } from "@/lib/db";

const DOC_LABELS: Record<string, string> = {
  EGRN: "Выписка ЕГРН",
  PASSPORT: "Паспорт",
  OWNERSHIP_DOC: "Документ основания",
  PRIVATIZATION_REFUSAL: "Отказ от приватизации",
  MARRIAGE_CERT: "Свид. о браке",
};

export default async function AdminLotsPage() {
  // Fetch real data from Prisma
  const realLots = await prisma.lot.findMany({
    where: {
      status: { in: ['DOCS_AUDIT', 'MANAGER_HANDOFF', 'SOLD', 'CANCELED'] }
    },
    take: 100, // Safe fetch limit
    include: {
      owner: true,
      winner: true,
      bids: true,
      media: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  // Map real data to UI format
  const auditLots = realLots
    .filter((l: any) => l.status === 'DOCS_AUDIT')
    .map((l: any) => ({
      id: l.id,
      address: l.address,
      ownerName: l.owner?.fullName || 'Не указан',
      expectedPrice: Number(l.expectedPrice || 0).toLocaleString("ru-RU"),
      winningBid: Number(l.bids.find((b: any) => b.investorId === l.winnerId)?.amount || 0).toLocaleString("ru-RU"),
      investorName: l.winner?.fullName || 'Не указан',
      documents: l.media.map((m: any) => ({
        id: m.id,
        type: m.type || 'OTHER',
        label: DOC_LABELS[m.type || ''] || m.type || 'Документ'
      })),
    }));

  const handoffLots = realLots
    .filter((l: any) => l.status === 'MANAGER_HANDOFF')
    .map((l: any) => ({
      id: l.id,
      address: l.address,
      ownerName: l.owner?.fullName || 'Не указан',
      investorName: l.winner?.fullName || 'Не указан',
      investorDecision: 'approved', // If it reached handoff, investor approved
    }));

  const completedLots = realLots
    .filter((l: any) => l.status === 'SOLD' || l.status === 'CANCELED')
    .map((l: any) => ({
      id: l.id,
      address: l.address,
      ownerName: l.owner?.fullName || 'Не указан',
      investorName: l.winner?.fullName || 'Не указан',
      winningBid: Number(l.bids.find((b: any) => b.investorId === l.winnerId)?.amount || 0).toLocaleString("ru-RU"),
      rawWinningBid: Number(l.bids.find((b: any) => b.investorId === l.winnerId)?.amount || 0),
      status: l.status as "SOLD" | "CANCELED",
      completedAt: l.createdAt.toLocaleDateString("ru-RU"),
    }));

  // Analytics (using both real and demo)
  const soldCount = completedLots.filter((l: any) => l.status === "SOLD").length;
  const canceledCount = completedLots.filter((l: any) => l.status === "CANCELED").length;
  const totalSoldAmount = completedLots
    .filter((l: any) => l.status === "SOLD")
    .reduce((sum, l: any) => sum + (l.rawWinningBid || 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Аудит документов</h2>
          <p className="text-white/50">Просмотр и одобрение загруженных документов по лотам.</p>
        </div>
        <Badge variant="outline" className="border-purple-500/30 text-purple-500 bg-purple-500/10 flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {auditLots.length} на аудите
        </Badge>
      </div>

      {auditLots.map((lot: any) => (
        <Card key={lot.id} className="bg-black border-white/10 relative overflow-hidden">

          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{lot.address}</h3>
                <p className="text-white/50 text-sm mt-1">
                  Собственник: {lot.ownerName} · Цена: {lot.expectedPrice} ₽
                </p>
                <p className="text-white/50 text-sm">
                  Победная ставка: {lot.winningBid} ₽ ({lot.investorName})
                </p>
              </div>
              <Badge variant="outline" className="border-purple-500/30 text-purple-500 bg-purple-500/10">
                Аудит
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-white/70 mb-3">Загруженные документы:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {lot.documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="group flex flex-col items-center gap-2 p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
                  >
                    <Eye className="w-6 h-6 text-white/50 group-hover:text-white transition-colors" />
                    <span className="text-xs text-white/70 group-hover:text-white text-center transition-colors">
                      {doc.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <LotAuditActions lotId={lot.id} />
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Manager Handoff Section */}
      <div className="pt-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-1">Переданы менеджеру</h2>
            <p className="text-white/50">Лоты, по которым инвестор принял решение. Требуется ручная связь.</p>
          </div>
          <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10 flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {handoffLots.length} ожидают звонка
          </Badge>
        </div>

        {handoffLots.map((lot: any) => (
          <Card key={lot.id} className="bg-black border-white/10 mb-4 relative overflow-hidden">
            {lot.isReal && (
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg z-10">
                REAL DB
              </div>
            )}
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{lot.address}</h3>
                  <p className="text-white/50 text-sm mt-1">
                    Собственник: {lot.ownerName} · Инвестор: {lot.investorName}
                  </p>
                </div>
                {lot.investorDecision === "approved" ? (
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    Инвестор одобрил
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-red-500/30 text-red-500 bg-red-500/10 flex items-center gap-1">
                    <UserX className="w-3 h-3" />
                    Инвестор отклонил
                  </Badge>
                )}
              </div>
              <div className="flex justify-end mt-3 pt-3 border-t border-white/10">
                <LotHandoffActions lotId={lot.id} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completed Deals Section */}
      <div className="pt-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-1">Завершённые сделки</h2>
            <p className="text-white/50">Аналитика и история закрытых лотов.</p>
          </div>
          <Badge variant="outline" className="border-white/20 text-white/60 bg-white/5 flex items-center gap-1">
            <BarChart3 className="w-3 h-3" />
            {completedLots.length} всего
          </Badge>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-emerald-950/30 border-emerald-500/20">
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{soldCount}</p>
                <p className="text-xs text-emerald-500/70">Сделок завершено</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-950/30 border-red-500/20">
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{canceledCount}</p>
                <p className="text-xs text-red-500/70">Отменено</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-950/30 border-blue-500/20">
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{totalSoldAmount.toLocaleString("ru-RU")} ₽</p>
                <p className="text-xs text-blue-500/70">Общая сумма сделок</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Completed Lots List */}
        {completedLots.map((lot: any) => (
          <Card key={lot.id} className="bg-black border-white/10 mb-4 relative overflow-hidden">
            {lot.isReal && (
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg z-10">
                REAL DB
              </div>
            )}
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{lot.address}</h3>
                  <p className="text-white/50 text-sm mt-1">
                    Собственник: {lot.ownerName} · Инвестор: {lot.investorName}
                  </p>
                  <p className="text-white/40 text-xs mt-1">
                    Ставка: {lot.winningBid} ₽ · Завершено: {lot.completedAt}
                  </p>
                </div>
                {lot.status === "SOLD" ? (
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Продано
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-red-500/30 text-red-500 bg-red-500/10 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Отменено
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
