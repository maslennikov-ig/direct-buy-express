import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Clock, Users } from "lucide-react";
import { VerifyButton } from "./verify-button";

// Demo data — заменится реальными Prisma-запросами при подключении БД
const unverifiedInvestors = [
  { id: "inv-1", telegramId: "298374651", fullName: "Алексей Смирнов", phone: "+7 (999) 123-45-67", budget: "5 000 000 — 12 000 000 ₽", districts: "Москва, ЦАО", createdAt: "04.03.2026" },
  { id: "inv-2", telegramId: "194827365", fullName: "Мария Козлова", phone: "+7 (916) 555-33-22", budget: "8 000 000 — 20 000 000 ₽", districts: "СПб, Центр", createdAt: "05.03.2026" },
  { id: "inv-3", telegramId: "574839201", fullName: "Дмитрий Волков", phone: "+7 (905) 777-88-99", budget: "3 000 000 — 7 000 000 ₽", districts: "Казань", createdAt: "06.03.2026" },
];

const verifiedInvestors = [
  { id: "inv-v1", telegramId: "483920175", fullName: "Иван Петров", budget: "10 000 000 — 25 000 000 ₽" },
  { id: "inv-v2", telegramId: "192837465", fullName: "Елена Новикова", budget: "15 000 000 — 40 000 000 ₽" },
];

export default function AdminInvestorsPage() {
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
            {unverifiedInvestors.length} на проверке
          </Badge>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {verifiedInvestors.length} верифицированы
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
              {unverifiedInvestors.map((inv) => (
                <TableRow key={inv.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="font-mono text-blue-400">{inv.telegramId}</TableCell>
                  <TableCell>{inv.fullName}</TableCell>
                  <TableCell className="text-white/70">{inv.phone}</TableCell>
                  <TableCell className="font-mono">{inv.budget}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{inv.districts}</TableCell>
                  <TableCell className="text-white/50">{inv.createdAt}</TableCell>
                  <TableCell className="text-right">
                    <VerifyButton profileId={inv.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="text-white/50">Telegram ID</TableHead>
                <TableHead className="text-white/50">Имя</TableHead>
                <TableHead className="text-white/50">Бюджет</TableHead>
                <TableHead className="text-white/50">Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {verifiedInvestors.map((inv) => (
                <TableRow key={inv.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="font-mono text-blue-400">{inv.telegramId}</TableCell>
                  <TableCell>{inv.fullName}</TableCell>
                  <TableCell className="font-mono">{inv.budget}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
