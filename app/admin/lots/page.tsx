import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

// Mock Data
type LotStatus = "Аукцион" | "Ожидает решения" | "Ждем доки" | "Готово к сделке";

interface Lot {
  id: string;
  address: string;
  price: string;
  status: LotStatus;
  timer: string;
  isAlert: boolean;
}

const lots: Lot[] = [
  { id: "LOT-1045", address: "г. Москва, ул. Тверская, д. 15", price: "25 000 000 ₽", status: "Аукцион", timer: "01:45:20", isAlert: false },
  { id: "LOT-1044", address: "г. Санкт-Петербург, Невский пр., д. 45", price: "18 500 000 ₽", status: "Ожидает решения", timer: "00:15:00", isAlert: true },
  { id: "LOT-1043", address: "г. Казань, ул. Баумана, д. 10", price: "12 000 000 ₽", status: "Ждем доки", timer: "05:30:00", isAlert: false },
  { id: "LOT-1042", address: "г. Сочи, Курортный пр., д. 50", price: "45 000 000 ₽", status: "Готово к сделке", timer: "-", isAlert: false },
  { id: "LOT-1041", address: "г. Екатеринбург, ул. Ленина, д. 20", price: "8 500 000 ₽", status: "Аукцион", timer: "00:05:10", isAlert: true },
];

const statusColors: Record<LotStatus, string> = {
  "Аукцион": "border-blue-500/30 text-blue-500 bg-blue-500/10",
  "Ожидает решения": "border-amber-500/30 text-amber-500 bg-amber-500/10",
  "Ждем доки": "border-purple-500/30 text-purple-500 bg-purple-500/10",
  "Готово к сделке": "border-emerald-500/30 text-emerald-500 bg-emerald-500/10",
};

export default function AdminLotsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Заявки (Аукционы)</h2>
          <p className="text-white/50">Управление всеми объектами недвижимости на платформе.</p>
        </div>
        <Button className="bg-white text-black hover:bg-white/90">
          Создать лот вручную
        </Button>
      </div>

      <Card className="bg-black border-white/10">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <Input 
              placeholder="Поиск по ID или адресу..." 
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
                <TableHead className="text-white/50">ID Лота</TableHead>
                <TableHead className="text-white/50">Адрес</TableHead>
                <TableHead className="text-white/50">Желаемая сумма</TableHead>
                <TableHead className="text-white/50">Текущий статус</TableHead>
                <TableHead className="text-white/50 text-right">Таймер SLA</TableHead>
                <TableHead className="text-white/50 text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.map((lot) => (
                <TableRow key={lot.id} className="border-white/10 hover:bg-white/5 group">
                  <TableCell className="font-medium">{lot.id}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={lot.address}>{lot.address}</TableCell>
                  <TableCell className="font-mono">{lot.price}</TableCell>
                  <TableCell>
                    <div className="relative">
                      <select 
                        className={`appearance-none bg-transparent border rounded-md px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-white/20 cursor-pointer transition-colors ${statusColors[lot.status]}`}
                        defaultValue={lot.status}
                      >
                        <option value="Аукцион" className="bg-zinc-900 text-white">Аукцион</option>
                        <option value="Ожидает решения" className="bg-zinc-900 text-white">Ожидает решения</option>
                        <option value="Ждем доки" className="bg-zinc-900 text-white">Ждем доки</option>
                        <option value="Готово к сделке" className="bg-zinc-900 text-white">Готово к сделке</option>
                      </select>
                    </div>
                  </TableCell>
                  <TableCell className={`text-right font-mono ${lot.isAlert ? 'text-red-500 font-bold' : 'text-white/70'}`}>
                    {lot.timer}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-white/50 hover:text-white hover:bg-white/10">
                      Подробнее
                    </Button>
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
