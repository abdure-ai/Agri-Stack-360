import GridShape from "@/components/common/GridShape";
import PageMeta from "@/components/common/PageMeta";
import { tr } from "@/i18n/core";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <>
      <PageMeta title={`${tr("notFound.title")} | ${tr("app.name")}`} description={tr("notFound.description")} />
      <div className="relative z-1 flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
        <GridShape />
        <div className="mx-auto w-full max-w-60.5 text-center sm:max-w-118">
          <h1 className="mb-8 text-title-md font-bold text-gray-800 xl:text-title-2xl dark:text-white/90">{tr("notFound.error")}</h1>
          <img src="/images/error/404.svg" alt="404" className="dark:hidden" />
          <img src="/images/error/404-dark.svg" alt="404" className="hidden dark:block" />
          <p className="mt-10 mb-6 text-base text-gray-700 sm:text-lg dark:text-gray-400">
            {tr("notFound.message")}
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/3 dark:hover:text-gray-200"
          >
            {tr("notFound.back")}
          </Link>
        </div>
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-sm text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} Agri-Stack 360
        </p>
      </div>
    </>
  );
}
