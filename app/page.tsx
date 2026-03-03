"use client";

import { useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Shield, Zap, CheckCircle2, Building2, ChevronRight } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function LandingPage() {
  const benefitsRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: benefitsRef,
    offset: ["start end", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [30, -30]);
  const y2 = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const y3 = useTransform(scrollYProgress, [0, 1], [30, -30]);
  const yOffsets = [y1, y2, y3];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center">
              <Building2 className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-bold tracking-tight">Direct Buy</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
            <Link href="#how-it-works" className="hover:text-white transition-colors">Как это работает</Link>
            <Link href="#benefits" className="hover:text-white transition-colors">Преимущества</Link>
            <Link href="/admin" className="hover:text-white transition-colors">Вход для партнеров</Link>
          </div>
          <Button asChild variant="outline" className="border-white/20 bg-transparent hover:bg-white hover:text-black">
            <Link href="https://t.me/directbuy_bot" target="_blank">
              Оставить заявку
            </Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-black to-black -z-10" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-4xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium tracking-wide uppercase text-white/80">Закрытый пул инвесторов</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1] mb-8">
              Срочный выкуп недвижимости <br className="hidden md:block" />
              <span className="text-white/50">напрямую инвесторами.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl leading-relaxed">
              Продайте вашу квартиру за 24 часа без комиссий и посредников. 
              Получите аванс уже через 3 часа после оценки.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="h-14 px-8 text-base bg-white text-black hover:bg-white/90 rounded-full">
                <Link href="https://t.me/directbuy_bot" target="_blank">
                  Продать за 24 часа
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base border-white/20 bg-transparent hover:bg-white/10 rounded-full">
                <Link href="https://t.me/directbuy_bot" target="_blank">
                  Стать Инвестором
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-zinc-950 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Как проходит сделка</h2>
              <p className="text-white/50 text-lg max-w-xl">Прозрачный процесс от заявки до получения денег на счет.</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Заявка", desc: "Заполните короткую форму в Telegram-боте. Это займет 2 минуты." },
              { step: "02", title: "Аукцион", desc: "Ваш объект попадает в закрытый пул инвесторов на 2 часа." },
              { step: "03", title: "Аванс", desc: "Победитель аукциона вносит аванс в течение 3 часов." },
              { step: "04", title: "Сделка", desc: "Оформление документов и полный расчет за 24 часа." }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative group"
              >
                <div className="text-6xl font-black text-white/10 mb-6 group-hover:text-white group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] transition-all duration-300">{item.step}</div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-white/50 leading-relaxed">{item.desc}</p>
                {i !== 3 && <ChevronRight className="hidden md:block absolute top-1/2 -right-6 text-white/10 w-8 h-8" />}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" ref={benefitsRef} className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-16 text-center">Почему Direct Buy</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Zap className="w-6 h-6 text-white" />,
                title: "Жесткие SLA",
                desc: "Мы гарантируем выплату аванса за 3 часа после согласования цены. Время — деньги."
              },
              {
                icon: <CheckCircle2 className="w-6 h-6 text-white" />,
                title: "0% Комиссии",
                desc: "Собственник не платит никаких скрытых комиссий. Вы получаете ровно ту сумму, о которой договорились."
              },
              {
                icon: <Shield className="w-6 h-6 text-white" />,
                title: "Полное NDA",
                desc: "Информация о продаже не публикуется на открытых площадках. Сделка проходит строго конфиденциально."
              }
            ].map((item, i) => (
              <motion.div 
                key={i}
                style={{ y: yOffsets[i] }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="p-8 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors duration-200"
              >
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6">
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-white/50 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white text-black">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-8">Готовы к сделке?</h2>
          <p className="text-xl text-black/60 mb-10 max-w-2xl mx-auto">
            Оставьте заявку прямо сейчас и получите первое предложение от инвесторов уже через несколько часов.
          </p>
          <Button asChild size="lg" className="h-16 px-10 text-lg bg-black text-white hover:bg-black/90 rounded-full">
            <Link href="https://t.me/directbuy_bot" target="_blank">
              Перейти в Telegram-бот
              <ArrowRight className="ml-2 w-6 h-6" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 bg-black">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-white/50" />
            <span className="text-lg font-bold tracking-tight text-white/50">Direct Buy</span>
          </div>
          <div className="flex gap-6 text-sm text-white/40">
            <Dialog>
              <DialogTrigger className="hover:text-white transition-colors text-left">Публичная оферта</DialogTrigger>
              <DialogContent className="bg-zinc-950 text-white border-white/10 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl">Публичная оферта</DialogTitle>
                  <DialogDescription className="text-white/50">
                    Редакция от {new Date().toLocaleDateString('ru-RU')}
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4 text-sm text-white/70">
                  <div className="space-y-4">
                    <p><strong>1. Общие положения</strong></p>
                    <p>1.1. Настоящий документ является публичной офертой в соответствии со ст. 437 Гражданского кодекса Российской Федерации.</p>
                    <p>1.2. Платформа «Direct Buy» предоставляет доступ к закрытому пулу инвесторов для срочного выкупа недвижимости.</p>
                    <p><strong>2. Предмет соглашения</strong></p>
                    <p>2.1. Исполнитель обязуется предоставить Заказчику (продавцу недвижимости) доступ к платформе для проведения закрытого аукциона среди верифицированных инвесторов.</p>
                    <p>2.2. Заказчик не несет расходов на комиссионное вознаграждение Исполнителю (0% комиссии).</p>
                    <p><strong>3. Права и обязанности сторон</strong></p>
                    <p>3.1. Исполнитель обязуется обеспечить проведение аукциона в течение 2 часов с момента публикации лота.</p>
                    <p>3.2. Победитель аукциона (Инвестор) обязуется внести аванс в течение 3 часов после согласования цены.</p>
                    <p><strong>4. Ответственность сторон</strong></p>
                    <p>4.1. Стороны несут ответственность за неисполнение обязательств в соответствии с действующим законодательством РФ.</p>
                    <p><strong>5. Разрешение споров</strong></p>
                    <p>5.1. Все споры и разногласия решаются путем переговоров. При недостижении согласия спор передается на рассмотрение в суд по месту нахождения Исполнителя.</p>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger className="hover:text-white transition-colors text-left">Политика конфиденциальности</DialogTrigger>
              <DialogContent className="bg-zinc-950 text-white border-white/10 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl">Политика конфиденциальности</DialogTitle>
                  <DialogDescription className="text-white/50">
                    В соответствии с ФЗ-152 «О персональных данных»
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4 text-sm text-white/70">
                  <div className="space-y-4">
                    <p><strong>1. Общие положения</strong></p>
                    <p>1.1. Настоящая Политика конфиденциальности разработана в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».</p>
                    <p><strong>2. Состав обрабатываемых данных</strong></p>
                    <p>2.1. Мы собираем следующие данные: имя, номер телефона, никнейм в Telegram, адрес и характеристики объекта недвижимости, фотографии объекта.</p>
                    <p><strong>3. Цели обработки персональных данных</strong></p>
                    <p>3.1. Данные обрабатываются исключительно в целях оценки стоимости недвижимости и проведения закрытого аукциона среди инвесторов платформы.</p>
                    <p><strong>4. Защита персональных данных</strong></p>
                    <p>4.1. Оператор принимает все необходимые организационные и технические меры для защиты персональных данных Пользователя от неправомерного доступа, уничтожения, изменения, блокирования, копирования, распространения.</p>
                    <p><strong>5. Права пользователя</strong></p>
                    <p>5.1. Пользователь вправе в любой момент отозвать согласие на обработку персональных данных, направив соответствующий запрос в службу поддержки.</p>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger className="hover:text-white transition-colors text-left">NDA</DialogTrigger>
              <DialogContent className="bg-zinc-950 text-white border-white/10 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl">Соглашение о неразглашении (NDA)</DialogTitle>
                  <DialogDescription className="text-white/50">
                    В соответствии с ФЗ-98 «О коммерческой тайне»
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4 text-sm text-white/70">
                  <div className="space-y-4">
                    <p><strong>1. Предмет соглашения</strong></p>
                    <p>1.1. Настоящее Соглашение о неразглашении конфиденциальной информации (NDA) регулируется положениями Федерального закона от 29.07.2004 № 98-ФЗ «О коммерческой тайне».</p>
                    <p><strong>2. Конфиденциальная информация</strong></p>
                    <p>2.1. К конфиденциальной информации относятся: точный адрес объекта, фотографии интерьера, персональные данные продавца, предложенные ставки инвесторов, итоговая сумма выкупа.</p>
                    <p><strong>3. Обязательства сторон</strong></p>
                    <p>3.1. Платформа «Direct Buy» и Инвесторы обязуются не разглашать Конфиденциальную информацию третьим лицам и не публиковать её на открытых площадках (ЦИАН, Авито и др.) без письменного согласия Продавца.</p>
                    <p><strong>4. Ответственность</strong></p>
                    <p>4.1. В случае нарушения обязательств по неразглашению, виновная сторона несет ответственность в соответствии с законодательством РФ и обязана возместить причиненные убытки.</p>
                    <p><strong>5. Срок действия</strong></p>
                    <p>5.1. Обязательства по неразглашению сохраняют силу в течение 3 (трех) лет с момента получения доступа к Конфиденциальной информации.</p>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
          <div className="text-sm text-white/40">
            © {new Date().getFullYear()} Direct Buy. Все права защищены.
          </div>
        </div>
      </footer>
    </div>
  );
}
