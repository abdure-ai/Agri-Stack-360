import ChatPanel from "@/components/chat/ChatPanel";
import OfflineBanner from "@/components/common/OfflineBanner";
import { useAuth } from "@/context/AuthContext";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { cn } from "@/utils";
import { Outlet, useLocation } from "react-router";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import Backdrop from "./Backdrop";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { pathname } = useLocation();
  const { can } = useAuth();

  return (
    <div className="min-h-screen xl:flex">
      {/* Printed reports (e.g. Area reports) show the page content only. */}
      <div className="print:hidden">
        <AppSidebar />
        <Backdrop />
      </div>

      <div
        className={cn(
          "min-w-0 flex-1 transition-[margin] duration-300 ease-in-out",
          isExpanded || isHovered ? "xl:ms-72.5" : "xl:ms-22.5",
          isMobileOpen ? "ms-0" : "",
          "print:ms-0",
        )}
      >
        <AppHeader />
        <main className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6">
          <OfflineBanner />
          <Outlet />
        </main>
      </div>

      {/* The advisory page is already a full chat; skip the floating one there. */}
      {pathname !== "/advisory" && can("advisory:use") && (
        <div className="print:hidden">
          <ChatPanel />
        </div>
      )}
    </div>
  );
};

const AppLayout: React.FC = () => (
  <SidebarProvider>
    <LayoutContent />
  </SidebarProvider>
);

export default AppLayout;
