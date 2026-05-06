"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Package, 
  Settings, 
  LogOut,
  ChevronRight,
  Users,
  MessageCircle,
  MessageSquare,
  User
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export default function LayoutShell({ children }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: 'Productos', href: '/products', icon: Package },
    { name: 'Instagram', href: '/instagram', icon: MessageCircle },
    { name: 'WhatsApp', href: '/whatsapp', icon: MessageSquare },
    { name: 'Cerebro IA', href: '/settings/ai', icon: Zap },
  ];

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
          <div className="sidebar-logo" style={{ marginTop: '-1.5rem', marginBottom: '1.5rem' }}>
            <img src="/logo.png" alt="Practiiko" style={{ height: '120px', width: 'auto', objectFit: 'contain' }} />
          </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navItems.map((item) => {
            if (item.adminOnly && session?.user?.role !== 'admin') return null;
            
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
                {isActive && <ChevronRight size={16} style={{ marginLeft: 'auto' }} />}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <button 
            onClick={() => signOut()}
            className="nav-link" 
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
