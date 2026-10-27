import Logo from "@/components/common/Logo";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { useI18n } from "@/i18n/I18nProvider";
import { HorizontaLDots } from "@/icons";
import { cn } from "@/utils";
import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import { visibleNav } from "./navigation";

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, setIsMobileOpen } = useSidebar();
  const { can } = useAuth();
  const { t } = useI18n();
  const { pathname } = useLocation();
  const showText = isExpanded || isHovered || isMobileOpen;

  // Close the mobile drawer after navigating.
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, setIsMobileOpen]);

  const isActive = (path: string) => (path === "/" ? pathname === "/" : pathname.startsWith(path));

  return (
    <aside
      className={cn(
        "fixed inset-s-0 top-0 z-50 flex h-screen flex-col border-e border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out xl:translate-x-0 xl:rtl:translate-x-0 dark:border-gray-800 dark:bg-gray-900",
        showText ? "w-72.5" : "w-22.5",
        isMobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
      )}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={t("common.mainNavigation")}
    >
      <div className={cn("flex py-8", !isExpanded && !isHovered ? "xl:justify-center" : "justify-start")}>
        <Link to="/dashboard" aria-label={t("app.home")}>
          <Logo iconOnly={!showText} />
        </Link>
      </div>

      <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6 flex flex-col gap-6">
          {visibleNav(can).map((group) => (
            <div key={group.title}>
              <h2
                className={cn(
                  "mb-4 flex text-xs leading-5 text-gray-400 uppercase",
                  !isExpanded && !isHovered ? "xl:justify-center" : "justify-start",
                )}
              >
                {showText ? t(group.title) : <HorizontaLDots className="size-6" aria-hidden="true" />}
              </h2>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        title={showText ? undefined : t(item.name)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group menu-item",
                          active ? "menu-item-active" : "menu-item-inactive",
                          !showText && "xl:justify-center",
                        )}
                      >
                        <span className={active ? "menu-item-icon-active" : "menu-item-icon-inactive"}>{item.icon}</span>
                        {showText && <span className="menu-item-text">{t(item.name)}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {showText && (
          <div className="mt-auto pb-8">
            <div className="rounded-2xl bg-gray-50 px-4 py-4 text-theme-xs text-gray-500 dark:bg-white/3 dark:text-gray-400">
              {t("sidebar.dataNote")}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
