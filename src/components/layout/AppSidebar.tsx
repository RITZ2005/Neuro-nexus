import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  LayoutDashboard,
  Users,
  FileText,
  FolderOpen,
  Settings,
  Microscope,
<<<<<<< HEAD
  Home,
  UserPlus
=======
  Rss
>>>>>>> e634e94 (Update every feature)
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const navigationItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Feed', url: '/feed', icon: Home },
  { title: 'My Network', url: '/network', icon: Users },
  { title: 'Profile', url: '/profile', icon: User },
<<<<<<< HEAD
  { title: 'Collaborators', url: '/collaborators', icon: UserPlus },
=======
  { title: 'Feed', url: '/feed', icon: Rss },
  { title: 'Collaborators', url: '/collaborators', icon: Users },
>>>>>>> e634e94 (Update every feature)
  { title: 'Projects', url: '/projects', icon: FolderOpen },
  { title: 'Publish', url: '/publish', icon: FileText },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();

  return (
    <Sidebar className={open ? 'w-64' : 'w-16'}>
      <SidebarContent className="border-r border-sidebar-border bg-sidebar-background">
        {/* Header */}
        <div className="p-6 border-b border-sidebar-border">
          <motion.div 
            className="flex items-center space-x-3"
            initial={false}
            animate={{ opacity: open ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="w-10 h-10 rounded-xl hero-gradient flex items-center justify-center shadow-soft">
              <Microscope className="w-6 h-6 text-white" />
            </div>
            {open && (
              <div>
                <h2 className="font-bold text-base text-sidebar-foreground">Open Science</h2>
                <p className="text-xs text-sidebar-foreground/70">Platform</p>
              </div>
            )}
          </motion.div>
        </div>

        <SidebarGroup className="px-4">
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) => 
                        `flex items-center px-3 py-3 rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-primary text-primary-foreground font-medium shadow-soft'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        }`
                      }
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {open && <span className="ml-3 font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}