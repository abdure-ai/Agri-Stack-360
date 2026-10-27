import Logo from "@/components/common/Logo";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import LanguageSwitcher from "@/components/header/LanguageSwitcher";
import UserDropdown from "@/components/header/UserDropdown";
import { useSidebar } from "@/context/SidebarContext";
import { CloseIcon, MenuIcon } from "@/icons";
import { useI18n } from "@/i18n/I18nProvider";
import { Link } from "react-router";

const AppHeader: React.FC = () => {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { t } = useI18n();

  const handleToggle = () => {
    if (window.innerWidth >= 1280) toggleSidebar();
    else toggleMobileSidebar();
  };

  return (
    <header className="sticky top-0 z-999 flex print:hidden w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex grow items-center justify-between gap-3 px-3 py-3 xl:px-6 xl:py-4">
        <div className="flex items-center gap-3">
          <button
            className={`flex h-10 w-10 items-center justify-center rounded-lg border-gray-200 text-gray-500 lg:h-11 lg:w-11 xl:border dark:border-gray-800 dark:text-gray-400 ${
              isMobileOpen ? "bg-gray-100 dark:bg-white/3" : ""
            }`}
            onClick={handleToggle}
            aria-label={t("common.toggleSidebar")}
          >
            {isMobileOpen ? <CloseIcon className="size-6" /> : <MenuIcon className="size-6 rtl:-scale-x-100" />}
          </button>

          <Link to="/dashboard" className="xl:hidden" aria-label={t("app.home")}>
            <Logo className="hidden sm:inline-flex" />
            <Logo iconOnly className="sm:hidden" />
          </Link>
        </div>

        <div className="flex items-center gap-2 2xsm:gap-3">
          <LanguageSwitcher />
          <ThemeToggleButton />
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
