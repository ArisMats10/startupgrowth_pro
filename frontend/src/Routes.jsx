import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import SignupPage from "pages/signuppage";
import LoginPage from "pages/loginpage";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import NotFound from "pages/NotFound";
import SWOTAnalysisTool from './pages/swot-analysis-tool';
import Dashboard from './pages/dashboard';
import PortersFiveForcesAnalysis from './pages/porter-s-five-forces-analysis';
import BusinessPlanGenerator from './pages/business-plan-generator';
import ProfileSettings from './pages/profile-settings';
import HelpSupport from './pages/help-support';
import RequireAuth from "components/RequireAuth";


const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <ScrollToTop />
      <RouterRoutes>

        <Route path="/signup" element={<SignupPage/>}/>
        <Route path="/login" element={<LoginPage/>}/>
        <Route path="/" element={<Dashboard/>} />
        <Route
          path="/swot-analysis-tool"
          element={
            <RequireAuth>
              <SWOTAnalysisTool />
            </RequireAuth>
          }
        />
        <Route
          path="/porter-s-five-forces-analysis"
          element={
            <RequireAuth>
              <PortersFiveForcesAnalysis />
            </RequireAuth>
          }
        />
        <Route
          path="/business-plan-generator"
          element={
            <RequireAuth>
              <BusinessPlanGenerator />
            </RequireAuth>
          }
        />
        <Route
          path="/profile-settings"
          element={
            <RequireAuth>
              <ProfileSettings />
            </RequireAuth>
          }
        />
        <Route
          path="/help-support"
          element={
            <RequireAuth>
              <HelpSupport />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
