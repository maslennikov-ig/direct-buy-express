import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Activity, CheckCircle2, Users, FileText, Clock } from "lucide-react";

// Demo data — заменится реальными Prisma-запросами при подключении БД
const kpis = [
  { title: "Активных аукционов", value: "12", icon: Activity, color: "text-blue-500" },
  { title: "На аудите документов", value: "3", icon: FileText, color: "text-purple-500" },
  { title: "Ждут проверки (Инвесторы)", value: "5", icon: Users, color: "text-amber-500" },
];

const slaAlerts = [
  { id: "LOT-1042", address: "г. Москва, ул. Тверская, д. 15", status: "Ожидает документы", delay: "2ч 15м", owner: "Иванов А.А." },
  { id: "LOT-1038", address: "г. Санкт-Петербург, Невский пр., д. 45", status: "Клиент молчит", delay: "4ч 30м", owner: "Петрова М.В." },
  { id: "LOT-1045", address: "г. Казань, ул. Баумана, д. 10", status: "Ожидает документы", delay: "2ч 05м", owner: "Сидоров К.Н." },
];

export default function AdminDashboard() {
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

      {/* SLA Alerts Table */}
      <Card className="bg-black border-white/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <CardTitle>Требуют внимания (SLA Alerts)</CardTitle>
          </div>
          <p className="text-sm text-white/50">Лоты, ожидающие загрузки документов.</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="text-white/50">ID Лота</TableHead>
                <TableHead className="text-white/50">Адрес</TableHead>
                <TableHead className="text-white/50">Собственник</TableHead>
                <TableHead className="text-white/50">Статус</TableHead>
                <TableHead className="text-white/50 text-right">Задержка</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slaAlerts.map((alert) => (
                <TableRow key={alert.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium">{alert.id}</TableCell>
                  <TableCell>{alert.address}</TableCell>
                  <TableCell className="text-white/70">{alert.owner}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-red-500/30 text-red-500 bg-red-500/10">
                      {alert.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-500">{alert.delay}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
