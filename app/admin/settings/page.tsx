'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Bot, Clock, Bell, Loader2, Check, AlertCircle, Coins } from "lucide-react";

type Settings = Record<string, string>;

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => {
        setToast({ type: 'error', message: 'Не удалось загрузить настройки' });
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const update = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setDirty(false);
        setToast({ type: 'success', message: 'Настройки сохранены' });
      } else {
        const err = await res.json();
        setToast({ type: 'error', message: err.error || 'Ошибка сохранения' });
      }
    } catch {
      setToast({ type: 'error', message: 'Ошибка соединения' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl relative">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl border animate-in slide-in-from-top-2 ${
          toast.type === 'success'
            ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300'
            : 'bg-red-950 border-red-500/30 text-red-300'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

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
            Информация о подключённом боте.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-white/70">Имя бота</Label>
            <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white/70 font-mono text-sm">
              @{process.env.NEXT_PUBLIC_BOT_USERNAME || 'не указано'}
            </div>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
            <div className="space-y-0.5">
              <Label className="text-base">Активность бота</Label>
              <p className="text-sm text-white/50">Принимать новые заявки от пользователей</p>
            </div>
            <Switch
              checked={settings.BOT_ACTIVE === 'true'}
              onCheckedChange={(checked) => update('BOT_ACTIVE', checked ? 'true' : 'false')}
            />
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
            Время, отведённое на каждый этап сделки. Значения в часах.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="sla-docs" className="text-white/70">Загрузка документов (часы)</Label>
              <Input
                id="sla-docs"
                type="number"
                min="1"
                value={settings.SLA_DOCS_UPLOAD_HOURS || ''}
                onChange={(e) => update('SLA_DOCS_UPLOAD_HOURS', e.target.value)}
                className="bg-white/5 border-white/10 text-white focus-visible:ring-white/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sla-investor" className="text-white/70">Решение инвестора (часы)</Label>
              <Input
                id="sla-investor"
                type="number"
                min="1"
                value={settings.SLA_INVESTOR_REVIEW_HOURS || ''}
                onChange={(e) => update('SLA_INVESTOR_REVIEW_HOURS', e.target.value)}
                className="bg-white/5 border-white/10 text-white focus-visible:ring-white/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sla-offer" className="text-white/70">Ответ на оффер (часы)</Label>
              <Input
                id="sla-offer"
                type="number"
                min="1"
                value={settings.SLA_OFFER_RESPONSE_HOURS || ''}
                onChange={(e) => update('SLA_OFFER_RESPONSE_HOURS', e.target.value)}
                className="bg-white/5 border-white/10 text-white focus-visible:ring-white/20"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Fee */}
      <Card className="bg-black border-white/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-400" />
            <CardTitle>Платформа</CardTitle>
          </div>
          <CardDescription className="text-white/50">
            Финансовые параметры платформы.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="platform-fee" className="text-white/70">Комиссия платформы (₽)</Label>
            <Input
              id="platform-fee"
              type="number"
              min="0"
              value={settings.PLATFORM_FEE_RUB || ''}
              onChange={(e) => update('PLATFORM_FEE_RUB', e.target.value)}
              className="bg-white/5 border-white/10 text-white focus-visible:ring-white/20"
            />
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
            Telegram ID менеджеров, которые получают уведомления о событиях (через запятую).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="manager-ids" className="text-white/70">ID менеджеров</Label>
            <Input
              id="manager-ids"
              value={settings.MANAGER_CHAT_ID || ''}
              onChange={(e) => update('MANAGER_CHAT_ID', e.target.value)}
              placeholder="82003266,166848328"
              className="bg-white/5 border-white/10 text-white focus-visible:ring-white/20 font-mono"
            />
            <p className="text-xs text-white/30">
              Несколько ID разделяйте запятыми. Эти же ID используются для авторизации в админке.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-8">
        <Button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="bg-white text-black hover:bg-white/90 px-8 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saving ? 'Сохранение...' : 'Сохранить изменения'}
        </Button>
      </div>
    </div>
  );
}
