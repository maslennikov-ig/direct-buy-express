import { Building2 } from "lucide-react";
import { AdminSidebar } from "./components/admin-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-black hidden md:flex flex-col">
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center">
              <Building2 className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-bold tracking-tight">Direct Buy</span>
          </div>
        </div>
        
        <AdminSidebar />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 border-b border-white/10 bg-black/50 backdrop-blur-md flex items-center px-8 justify-between sticky top-0 z-10">
          <h1 className="text-xl font-semibold">Панель управления</h1>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-medium">
              A
            </div>
          </div>
        </header>
        <div className="p-8 flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
