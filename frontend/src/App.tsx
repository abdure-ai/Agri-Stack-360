import { GuestOnly, RequireAuth, RequirePermission } from "@/components/auth/RouteGuards";
import { ScrollToTop } from "@/components/common/ScrollToTop";
import { LoadingState } from "@/components/common/States";
import Landing from "@/pages/Public/Landing";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router";
import { lazy, Suspense } from "react";

// Public pages (landing, feedback, privacy) are what visitors open from the exhibition QR codes on a phone:
// they load without any of the signed-in app. Every app screen is its own chunk, loaded when opened.
const Feedback = lazy(() => import("@/pages/Public/Feedback"));
const Privacy = lazy(() => import("@/pages/Public/Privacy"));

const AppLayout = lazy(() => import("@/layout/AppLayout"));
const DataSync = lazy(() => import("@/pages/Admin/DataSync"));
const KnowledgeBase = lazy(() => import("@/pages/Admin/KnowledgeBase"));
const AiKeys = lazy(() => import("@/pages/Admin/AiKeys"));
const Permissions = lazy(() => import("@/pages/Admin/Permissions"));
const Roles = lazy(() => import("@/pages/Admin/Roles"));
const Users = lazy(() => import("@/pages/Admin/Users"));
const Advisory = lazy(() => import("@/pages/Advisory/Advisory"));
const SignIn = lazy(() => import("@/pages/AuthPages/SignIn"));
const SignUp = lazy(() => import("@/pages/AuthPages/SignUp"));
const CropHealth = lazy(() => import("@/pages/CropHealth/CropHealth"));
const Home = lazy(() => import("@/pages/Dashboard/Home"));
const Financial = lazy(() => import("@/pages/Financial/Financial"));
const InputSuppliers = lazy(() => import("@/pages/Inputs/InputSuppliers"));
const Livestock = lazy(() => import("@/pages/Market/Livestock"));
const AbcRules = lazy(() => import("@/pages/Admin/AbcRules"));
const MyAbc = lazy(() => import("@/pages/Abc/MyAbc"));
const AbcPortfolio = lazy(() => import("@/pages/Abc/AbcPortfolio"));
const MarketIntel = lazy(() => import("@/pages/Market/MarketIntel"));
const AdvisorySettings = lazy(() => import("@/pages/Admin/AdvisorySettings"));
const AuditLog = lazy(() => import("@/pages/Admin/AuditLog"));
const Monitoring = lazy(() => import("@/pages/Admin/Monitoring"));
const Copilot = lazy(() => import("@/pages/DA/Copilot"));
const AreaReports = lazy(() => import("@/pages/Reports/AreaReports"));
const Organisations = lazy(() => import("@/pages/Admin/Organisations"));
const ReviewWorkspace = lazy(() => import("@/pages/Review/ReviewWorkspace"));
const DealerPortal = lazy(() => import("@/pages/Dealer/DealerPortal"));
const AbcPortal = lazy(() => import("@/pages/Abc/AbcPortal"));
const EstatePortal = lazy(() => import("@/pages/Estate/EstatePortal"));
const RegulatorPortal = lazy(() => import("@/pages/Regulator/RegulatorPortal"));
const NgoPortal = lazy(() => import("@/pages/Ngo/NgoPortal"));
const LenderPortal = lazy(() => import("@/pages/Lender/LenderPortal"));
const TipsPage = lazy(() => import("@/pages/Tips/TipsPage"));
const DailyTips = lazy(() => import("@/pages/Admin/DailyTips"));
const ErasureRequests = lazy(() => import("@/pages/Admin/ErasureRequests"));
const FeedbackAdmin = lazy(() => import("@/pages/Admin/FeedbackAdmin"));
const WebsitePartners = lazy(() => import("@/pages/Admin/WebsitePartners"));
const SupplierPortal = lazy(() => import("@/pages/Supplier/SupplierPortal"));
const VerifyProduct = lazy(() => import("@/pages/Trust/VerifyProduct"));
const Escalations = lazy(() => import("@/pages/DA/Escalations"));
const NotFound = lazy(() => import("@/pages/OtherPage/NotFound"));
const Profile = lazy(() => import("@/pages/Profile/Profile"));
// The map page brings Leaflet (~150 kB).
const MapPage = lazy(() => import("@/pages/Map/MapPage"));

/** Old /app/<page> addresses from the previous UI. */
const LEGACY_PATHS: Record<string, string> = {
  dashboard: "/dashboard",
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
  return <Navigate to={LEGACY_PATHS[page] ?? "/dashboard"} replace />;
}

const pageLoading = (
  <div className="flex min-h-screen items-center justify-center">
    <LoadingState />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={pageLoading}>
        <Routes>
          {/* Public website: the printed QR codes point at / and /feedback, so these addresses must not change. */}
          <Route index element={<Landing />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/privacy" element={<Privacy />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Home />} />
              <Route path="/market" element={<MarketIntel />} />
              <Route path="/livestock" element={<Livestock />} />
              <Route path="/map" element={<MapPage />} />
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
              <Route element={<RequirePermission any={["feedback:manage"]} />}>
                <Route path="/admin/feedback" element={<FeedbackAdmin />} />
              </Route>
              <Route element={<RequirePermission any={["site:manage"]} />}>
                <Route path="/admin/website-partners" element={<WebsitePartners />} />
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
          <Route path="/app" element={<Navigate to="/dashboard" replace />} />
          <Route path="/app/:page" element={<LegacyRedirect />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
