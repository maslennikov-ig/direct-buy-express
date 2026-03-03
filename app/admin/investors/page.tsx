import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Filter, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

// Mock Data
type InvestorStatus = "Активен" | "На проверке" | "Заблокирован";

interface Investor {
  id: string;
  telegram: string;
  name: string;
  deposit: string;
  status: InvestorStatus;
  date: string;
}

const investors: Investor[] = [
  { id: "INV-001", telegram: "@investor_pro", name: "ООО 'Капитал Групп'", deposit: "50 000 000 ₽", status: "Активен", date: "12.10.2025" },
  { id: "INV-002", telegram: "@new_money", name: "Иван Иванов", deposit: "-", status: "На проверке", date: "02.03.2026" },
  { id: "INV-003", telegram: "@kazan_invest", name: "Казань Инвест", deposit: "120 000 000 ₽", status: "Активен", date: "05.11.2025" },
  { id: "INV-004", telegram: "@scammer_123", name: "Неизвестно", deposit: "-", status: "Заблокирован", date: "01.03.2026" },
  { id: "INV-005", telegram: "@moscow_realty", name: "Moscow Realty Fund", deposit: "300 000 000 ₽", status: "Активен", date: "20.01.2026" },
];

const statusConfig: Record<InvestorStatus, { color: string, icon: React.ElementType }> = {
  "Активен": { color: "border-emerald-500/30 text-emerald-500 bg-emerald-500/10", icon: CheckCircle2 },
  "На проверке": { color: "border-amber-500/30 text-amber-500 bg-amber-500/10", icon: Clock },
  "Заблокирован": { color: "border-red-500/30 text-red-500 bg-red-500/10", icon: XCircle },
};

export default function AdminInvestorsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Инвесторы (Модерация)</h2>
          <p className="text-white/50">Управление базой инвесторов и их статусами.</p>
        </div>
        <Button className="bg-white text-black hover:bg-white/90">
          Добавить инвестора
        </Button>
      </div>

      <Card className="bg-black border-white/10">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <Input 
              placeholder="Поиск по Telegram или имени..." 
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
            />
          </div>
          <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white">
            <Filter className="w-4 h-4 mr-2" />
            Фильтры
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="text-white/50">ID</TableHead>
                <TableHead className="text-white/50">Telegram</TableHead>
                <TableHead className="text-white/50">Имя / Компания</TableHead>
                <TableHead className="text-white/50">Депозит</TableHead>
                <TableHead className="text-white/50">Статус</TableHead>
                <TableHead className="text-white/50">Дата рег.</TableHead>
                <TableHead className="text-white/50 text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investors.map((investor) => {
                const StatusIcon = statusConfig[investor.status].icon;
                return (
                  <TableRow key={investor.id} className="border-white/10 hover:bg-white/5 group">
                    <TableCell className="font-medium">{investor.id}</TableCell>
                    <TableCell className="text-blue-400 hover:underline cursor-pointer">{investor.telegram}</TableCell>
                    <TableCell>{investor.name}</TableCell>
                    <TableCell className="font-mono">{investor.deposit}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`flex w-fit items-center gap-1 ${statusConfig[investor.status].color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {investor.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white/50">{investor.date}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {investor.status === "На проверке" && (
                        <>
                          <Button variant="ghost" size="sm" className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10">
                            Одобрить
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400 hover:bg-red-500/10">
                            Отклонить
                          </Button>
                        </>
                      )}
                      {investor.status !== "На проверке" && (
                        <Button variant="ghost" size="sm" className="text-white/50 hover:text-white hover:bg-white/10">
                          Профиль
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
