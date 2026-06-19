"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Package, 
  Settings, 
  LogOut,
  ChevronRight,
  ChevronLeft,
  Users,
  MessageCircle,
  MessageSquare,
  User,
  Zap
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export default function LayoutShell({ children }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isLoginPage = pathname === "/login";

  // Persistent sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") {
      setIsCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Overview", href: "/", icon: LayoutDashboard, adminOnly: true },
    { name: 'Productos', href: '/products', icon: Package, adminOnly: true },
    { name: 'Instagram', href: '/instagram', icon: MessageCircle },
    { name: 'WhatsApp', href: '/whatsapp', icon: MessageSquare },
    { name: 'Cerebro IA', href: '/settings/ai', icon: Zap, adminOnly: true },
  ];

  return (
    <div className="dashboard-layout" style={{ '--sidebar-width': mounted && isCollapsed ? '80px' : '260px' }}>
      <aside className={`sidebar ${mounted && isCollapsed ? 'collapsed' : ''}`}>
        {/* Toggle arrow floating button */}
        {mounted && (
          <button 
            onClick={toggleSidebar} 
            title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
            style={{
              position: 'absolute',
              right: '-14px',
              top: '40px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#ffffff',
              border: '1.5px solid var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(4, 119, 191, 0.15)',
              color: 'var(--primary)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 100
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'var(--primary)';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.transform = 'scale(1.15)';
              e.currentTarget.style.boxShadow = '0 6px 14px rgba(4, 119, 191, 0.25)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.color = 'var(--primary)';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 10px rgba(4, 119, 191, 0.15)';
            }}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}

        <div className="sidebar-logo" style={{ padding: '1rem 0', display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-start', alignItems: 'center', transition: 'all 0.3s' }}>
          {mounted && isCollapsed ? (
            <span className="logo-gem" style={{ fontSize: '1.75rem', filter: 'drop-shadow(0 2px 8px rgba(4, 119, 191, 0.2))', cursor: 'pointer' }} onClick={toggleSidebar}>💎</span>
          ) : (
            <img src="/logo.webp" alt="Practiiko" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
          )}
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
                style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
              >
                <Icon size={20} style={{ flexShrink: 0 }} />
                {!isCollapsed && <span>{item.name}</span>}
                {isActive && !isCollapsed && <ChevronRight size={16} style={{ marginLeft: 'auto' }} />}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <button 
            onClick={() => signOut()}
            className="nav-link" 
            style={{ 
              width: '100%', 
              border: 'none', 
              background: 'transparent', 
              cursor: 'pointer',
              justifyContent: isCollapsed ? 'center' : 'flex-start' 
            }}
          >
            <LogOut size={20} style={{ flexShrink: 0 }} />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
