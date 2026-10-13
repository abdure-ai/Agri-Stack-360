import { GuestOnly, RequireAuth, RequirePermission } from "@/components/auth/RouteGuards";
import { ScrollToTop } from "@/components/common/ScrollToTop";
import AppLayout from "@/layout/AppLayout";
import DataSync from "@/pages/Admin/DataSync";
import KnowledgeBase from "@/pages/Admin/KnowledgeBase";
import AiKeys from "@/pages/Admin/AiKeys";
import Permissions from "@/pages/Admin/Permissions";
import Roles from "@/pages/Admin/Roles";
import Users from "@/pages/Admin/Users";
import Advisory from "@/pages/Advisory/Advisory";
import SignIn from "@/pages/AuthPages/SignIn";
import SignUp from "@/pages/AuthPages/SignUp";
import CropHealth from "@/pages/CropHealth/CropHealth";
import Home from "@/pages/Dashboard/Home";
import Financial from "@/pages/Financial/Financial";
import InputSuppliers from "@/pages/Inputs/InputSuppliers";
import Livestock from "@/pages/Market/Livestock";
import AbcRules from "@/pages/Admin/AbcRules";
import MyAbc from "@/pages/Abc/MyAbc";
import AbcPortfolio from "@/pages/Abc/AbcPortfolio";
import MarketIntel from "@/pages/Market/MarketIntel";
import AdvisorySettings from "@/pages/Admin/AdvisorySettings";
import AuditLog from "@/pages/Admin/AuditLog";
import Monitoring from "@/pages/Admin/Monitoring";
import Copilot from "@/pages/DA/Copilot";
import AreaReports from "@/pages/Reports/AreaReports";
import Organisations from "@/pages/Admin/Organisations";
import ReviewWorkspace from "@/pages/Review/ReviewWorkspace";
import DealerPortal from "@/pages/Dealer/DealerPortal";
import AbcPortal from "@/pages/Abc/AbcPortal";
import EstatePortal from "@/pages/Estate/EstatePortal";
import RegulatorPortal from "@/pages/Regulator/RegulatorPortal";
import NgoPortal from "@/pages/Ngo/NgoPortal";
import LenderPortal from "@/pages/Lender/LenderPortal";
import TipsPage from "@/pages/Tips/TipsPage";
import DailyTips from "@/pages/Admin/DailyTips";
import ErasureRequests from "@/pages/Admin/ErasureRequests";
import SupplierPortal from "@/pages/Supplier/SupplierPortal";
import VerifyProduct from "@/pages/Trust/VerifyProduct";
import Escalations from "@/pages/DA/Escalations";
import NotFound from "@/pages/OtherPage/NotFound";
import Profile from "@/pages/Profile/Profile";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router";
import { lazy, Suspense } from "react";
import { LoadingState } from "@/components/common/States";

// The map page brings Leaflet (~150 kB): loaded only when the page is opened.
const MapPage = lazy(() => import("@/pages/Map/MapPage"));

/** Old /app/<page> addresses from the previous UI. */
const LEGACY_PATHS: Record<string, string> = {
  dashboard: "/",
  market: "/market",
  "crop-health": "/crop-health",
  inputs: "/inputs",
  financial: "/financial",
  advisory: "/advisory",
  profile: "/profile",
  admin: "/admin/users",
  "data-sync": "/admin/data-sync",
};

function LegacyRedirect() {
  const { page = "" } = useParams();
  return <Navigate to={LEGACY_PATHS[page] ?? "/"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="/market" element={<MarketIntel />} />
            <Route path="/livestock" element={<Livestock />} />
            <Route path="/map" element={<Suspense fallback={<LoadingState />}><MapPage /></Suspense>} />
            <Route path="/my-abc" element={<MyAbc />} />
            <Route element={<RequirePermission any={["abc:portfolio"]} />}>
              <Route path="/abc-portfolio" element={<AbcPortfolio />} />
            </Route>
            <Route path="/advisory" element={<Advisory />} />
            <Route path="/tips" element={<TipsPage />} />
            <Route path="/profile" element={<Profile />} />

            <Route element={<RequirePermission any={["crop_health:use"]} />}>
              <Route path="/crop-health" element={<CropHealth />} />
            </Route>
            <Route element={<RequirePermission any={["inputs:read"]} />}>
              <Route path="/inputs" element={<InputSuppliers />} />
            </Route>
            <Route element={<RequirePermission any={["financial:read"]} />}>
              <Route path="/financial" element={<Financial />} />
            </Route>
            <Route element={<RequirePermission any={["users:manage"]} />}>
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/roles" element={<Roles />} />
              <Route path="/admin/permissions" element={<Permissions />} />
              <Route path="/admin/erasure-requests" element={<ErasureRequests />} />
            </Route>
            <Route element={<RequirePermission any={["sync:manage"]} />}>
              <Route path="/admin/data-sync" element={<DataSync />} />
            </Route>
            <Route element={<RequirePermission any={["knowledge:manage"]} />}>
              <Route path="/admin/knowledge" element={<KnowledgeBase />} />
            </Route>
            <Route element={<RequirePermission any={["advisory:admin"]} />}>
              <Route path="/admin/ai-keys" element={<AiKeys />} />
              <Route path="/admin/advisory-settings" element={<AdvisorySettings />} />
              <Route path="/admin/monitoring" element={<Monitoring />} />
            </Route>
            <Route element={<RequirePermission any={["audit:read"]} />}>
              <Route path="/admin/audit-log" element={<AuditLog />} />
            </Route>
            <Route element={<RequirePermission any={["inputs:verify"]} />}>
              <Route path="/verify" element={<VerifyProduct />} />
            </Route>
            <Route element={<RequirePermission any={["supplier:manage"]} />}>
              <Route path="/supplier" element={<SupplierPortal />} />
            </Route>
            <Route element={<RequirePermission any={["credit:request"]} />}>
              <Route path="/lender" element={<LenderPortal />} />
            </Route>
            <Route element={<RequirePermission any={["ngo:manage"]} />}>
              <Route path="/ngo" element={<NgoPortal />} />
            </Route>
            <Route element={<RequirePermission any={["registry:manage"]} />}>
              <Route path="/regulator" element={<RegulatorPortal />} />
            </Route>
            <Route element={<RequirePermission any={["estate:manage"]} />}>
              <Route path="/estate" element={<EstatePortal />} />
            </Route>
            <Route element={<RequirePermission any={["abc:manage", "abc:member"]} />}>
              <Route path="/abc" element={<AbcPortal />} />
            </Route>
            <Route element={<RequirePermission any={["dealer:manage"]} />}>
              <Route path="/dealer" element={<DealerPortal />} />
            </Route>
            <Route element={<RequirePermission any={["content:review"]} />}>
              <Route path="/review" element={<ReviewWorkspace />} />
              <Route path="/admin/tips" element={<DailyTips />} />
            </Route>
            <Route element={<RequirePermission any={["orgs:manage"]} />}>
              <Route path="/admin/orgs" element={<Organisations />} />
              <Route path="/admin/abc-rules" element={<AbcRules />} />
            </Route>
            <Route element={<RequirePermission any={["reports:read"]} />}>
              <Route path="/reports" element={<AreaReports />} />
            </Route>
            <Route element={<RequirePermission any={["da:work"]} />}>
              <Route path="/da" element={<Copilot />} />
              <Route path="/da/escalations" element={<Escalations />} />
            </Route>
          </Route>
        </Route>

        <Route element={<GuestOnly />}>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
        </Route>

        {/* Addresses from the previous UI */}
        <Route path="/login" element={<Navigate to="/signin" replace />} />
        <Route path="/register" element={<Navigate to="/signup" replace />} />
        <Route path="/app" element={<Navigate to="/" replace />} />
        <Route path="/app/:page" element={<LegacyRedirect />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
