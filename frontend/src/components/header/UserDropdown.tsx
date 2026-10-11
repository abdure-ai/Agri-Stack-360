import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";
import { roleLabel } from "@/utils/constants";
import { LogoutIcon, UserCircleIcon } from "@/icons";
import { useState } from "react";
import { useNavigate } from "react-router";

const ITEM =
  "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-theme-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300";

function initials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

export default function UserDropdown() {
  const { user, logout } = useAuth();
  const { t, term } = useI18n();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  function signOut() {
    close();
    logout();
    navigate("/signin");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="dropdown-toggle flex items-center text-gray-700 dark:text-gray-400"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className="me-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
          {initials(user?.name)}
        </span>
        <span className="me-1 hidden text-start sm:block">
          <span className="block text-theme-sm font-medium">{user?.name}</span>
          <span className="block text-theme-xs text-gray-500 dark:text-gray-400">{roleLabel(user?.role)}</span>
        </span>
        <svg
          className={`stroke-gray-500 transition-transform duration-200 dark:stroke-gray-400 ${isOpen ? "rotate-180" : ""}`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          aria-hidden="true"
        >
          <path d="M4.3125 8.65625L9 13.3437L13.6875 8.65625" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={close}
        className="absolute inset-e-0 mt-4.25 flex w-65 flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div className="px-1">
          <span className="block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{user?.name}</span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            {user?.phone} · {roleLabel(user?.role)}
            {user?.region ? ` · ${term("region", user.region)}` : ""}
          </span>
        </div>

        <ul className="flex flex-col gap-1 border-b border-gray-200 pt-4 pb-3 dark:border-gray-800">
          <li>
            <DropdownItem onItemClick={close} tag="a" to="/profile" className={ITEM}>
              <UserCircleIcon className="size-6 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" />
              {t("header.profileFarms")}
            </DropdownItem>
          </li>
        </ul>
        <button type="button" onClick={signOut} className={`${ITEM} mt-3`}>
          <LogoutIcon className="size-6 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" />
          {t("header.signOut")}
        </button>
      </Dropdown>
    </div>
  );
}
