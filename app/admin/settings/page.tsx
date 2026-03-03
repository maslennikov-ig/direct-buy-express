import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Bot, Clock, Bell } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Настройки</h2>
        <p className="text-white/50">Управление параметрами платформы и интеграциями.</p>
      </div>

      {/* Telegram Bot Settings */}
      <Card className="bg-black border-white/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            <CardTitle>Telegram Бот</CardTitle>
          </div>
          <CardDescription className="text-white/50">
            Настройки подключения основного бота для приема заявок.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="bot-token" className="text-white/70">Bot Token</Label>
            <Input 
              id="bot-token" 
              type="password" 
              defaultValue="1234567890:AAH_xxxxxxxxxxxxxxxxxxxxxxxxxxx" 
              className="bg-white/5 border-white/10 text-white focus-visible:ring-white/20 font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhook-url" className="text-white/70">Webhook URL</Label>
            <Input 
              id="webhook-url" 
              defaultValue="https://api.directbuy.ru/webhook/telegram" 
              className="bg-white/5 border-white/10 text-white focus-visible:ring-white/20 font-mono"
            />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
            <div className="space-y-0.5">
              <Label className="text-base">Активность бота</Label>
              <p className="text-sm text-white/50">Принимать новые заявки от пользователей</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* SLA Timers */}
      <Card className="bg-black border-white/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <CardTitle>SLA и Таймеры</CardTitle>
          </div>
          <CardDescription className="text-white/50">
            Настройка времени на различные этапы сделки.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="auction-time" className="text-white/70">Длительность аукциона (минуты)</Label>
              <Input 
                id="auction-time" 
                type="number" 
                defaultValue="120" 
                className="bg-white/5 border-white/10 text-white focus-visible:ring-white/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="advance-time" className="text-white/70">Ожидание аванса (минуты)</Label>
              <Input 
                id="advance-time" 
                type="number" 
                defaultValue="180" 
                className="bg-white/5 border-white/10 text-white focus-visible:ring-white/20"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-black border-white/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-400" />
            <CardTitle>Уведомления администратора</CardTitle>
          </div>
          <CardDescription className="text-white/50">
            Куда отправлять системные алерты и новые заявки.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
            <div className="space-y-0.5">
              <Label className="text-base">Telegram уведомления</Label>
              <p className="text-sm text-white/50">Отправлять в секретный чат администраторов</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-chat-id" className="text-white/70">Admin Chat ID</Label>
            <Input 
              id="admin-chat-id" 
              defaultValue="-1001234567890" 
              className="bg-white/5 border-white/10 text-white focus-visible:ring-white/20 font-mono"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="bg-white text-black hover:bg-white/90 px-8">
          <Save className="w-4 h-4 mr-2" />
          Сохранить изменения
        </Button>
      </div>
    </div>
  );
}
