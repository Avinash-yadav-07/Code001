import React from "react";
import Customer from "layouts/Customer-Dashboard";
import ManageEmployee from "layouts/manage-employee";
import ManageLeave from "layouts/manage-leaves";
import ManageProjects from "./layouts/manage-projects";
import ManageClient from "./layouts/manage-client";
import ManageRoles from "layouts/manage-roles";
import ManageEarnings from "layouts/manage-earning";
import ManageAccount from "./layouts/manage-accounts";
import ManageExpenses from "layouts/manage-expense";
import Icon from "@mui/material/Icon";
import Dashboard from "layouts/dashboard";
import Basic from "layouts/authentication/sign-in";
import Logout from "layouts/authentication/Logout";
import ProtectedRoute from "./layouts/authentication/ProtectedRoute";
import Unauthorized from "./layouts/authentication/Unauthorized";
import ManageCustomer from "layouts/manage-customer";
import ManageMarketing from "layouts/manage-marketing";
import ManageSales from "layouts/manage-sales";
import DashboardPage from "layouts/Sales-Marketing Dashboard";
import ProfilePage from "layouts/profile";

// Placeholder onClick handler for Manage buttons
const handleManageButtonClick = (buttonName) => {
  console.log(`Clicked: ${buttonName}`); // Replace with your desired effect (e.g., toggle CSS class)
  // Example: Add a CSS class for visual effect
  // const button = document.querySelector(`[data-key="${buttonName}"]`);
  // button.classList.add("clicked");
  // setTimeout(() => button.classList.remove("clicked"), 300);
};

const routes = [
  {
    route: "/sign-in",
    component: <Basic />,
  },
  {
    route: "/unauthorized",
    component: <Unauthorized />,
  },
  {
    type: "collapse",
    name: "Manage",
    key: "manage",
    icon: <Icon fontSize="small">tune</Icon>,
    collapse: [
      {
        type: "collapse",
        name: "Manage Employee",
        key: "manage-employee",
        icon: <Icon fontSize="small">people</Icon>,
        route: "/manage/employee",
        component: (
          <ProtectedRoute allowedRoles={["ManageEmployee:full access"]}>
            <ManageEmployee />
          </ProtectedRoute>
        ),
        onClick: () => handleManageButtonClick("Manage Employee"), // Added onClick
      },
      {
        type: "collapse",
        name: "Manage Leaves",
        key: "manage-leaves",
        icon: <Icon fontSize="small">people</Icon>,
        route: "/manage/leaves",
        component: (
          <ProtectedRoute allowedRoles={["ManageEmployee:full access"]}>
            <ManageEmployee />
          </ProtectedRoute>
        ),
        onClick: () => handleManageButtonClick("Manage Leaves"), // Added onClick
      },
      {
        name: "Manage Clients",
        key: "manage-clients",
        icon: <Icon fontSize="small">business</Icon>,
        route: "/manage/clients",
        component: (
          <ProtectedRoute
            allowedRoles={["ManageClient:full access", "ManageClient:read"]}
          >
            <ManageClient />
          </ProtectedRoute>
        ),
        onClick: () => handleManageButtonClick("Manage Clients"), // Added onClick
      },
      {
        name: "Manage Accounts",
        key: "manage-accounts",
        icon: <Icon fontSize="small">account_balance_wallet</Icon>,
        route: "/manage/accounts",
        component: (
          <ProtectedRoute
            allowedRoles={["ManageAccount:full access", "ManageAccount:read"]}
          >
            <ManageAccount />
          </ProtectedRoute>
        ),
        onClick: () => handleManageButtonClick("Manage Accounts"), // Added onClick
      },
      {
        name: "Manage Expenses",
        key: "manage-expenses",
        icon: <Icon fontSize="small">money_off</Icon>,
        route: "/manage/expenses",
        component: (
          <ProtectedRoute
            allowedRoles={["ManageExpense:full access", "ManageExpense:read"]}
          >
            <ManageExpenses />
          </ProtectedRoute>
        ),
        onClick: () => handleManageButtonClick("Manage Expenses"), // Added onClick
      },
      {
        name: "Manage Projects",
        key: "manage-projects",
        icon: <Icon fontSize="small">work</Icon>,
        route: "/manage/projects",
        component: (
          <ProtectedRoute
            allowedRoles={["ManageProject:full access", "ManageProject:read"]}
          >
            <ManageProjects />
          </ProtectedRoute>
        ),
        onClick: () => handleManageButtonClick("Manage Projects"), // Added onClick
      },
      {
        name: "Manage Roles",
        key: "manage-roles",
        icon: <Icon fontSize="small">admin_panel_settings</Icon>,
        route: "/manage/roles",
        component: (
          <ProtectedRoute
            allowedRoles={["ManageRoles:full access", "ManageRoles:read"]}
          >
            <ManageRoles />
          </ProtectedRoute>
        ),
        onClick: () => handleManageButtonClick("Manage Roles"), // Added onClick
      },
      {
        name: "Manage Earnings",
        key: "manage-earnings",
        icon: <Icon fontSize="small">attach_money</Icon>,
        route: "/manage/earnings",
        component: (
          <ProtectedRoute
            allowedRoles={["ManageEarning:full access", "ManageEarning:read"]}
          >
            <ManageEarnings />
          </ProtectedRoute>
        ),
        onClick: () => handleManageButtonClick("Manage Earnings"), // Added onClick
      },
      {
        name: "Manage Customers",
        key: "manage-customer",
        icon: <Icon fontSize="small">support_agent</Icon>,
        route: "/manage/customers",
        component: (
          <ProtectedRoute
            allowedRoles={["ManageCustomer:full access", "ManageCustomer:read"]}
          >
            <ManageCustomer />
          </ProtectedRoute>
        ),
        onClick: () => handleManageButtonClick("Manage Customer"), // Added onClick
      },
      {
        name: "Manage Marketing",
        key: "manage-marketing",
        icon: <Icon fontSize="small">campaign</Icon>,
        route: "/manage/marketing",
        component: (
          <ProtectedRoute
            allowedRoles={[
              "ManageMarketing:full access",
              "ManageMarketing:read",
            ]}
          >
            <ManageMarketing />
          </ProtectedRoute>
        ),
        onClick: () => handleManageButtonClick("Manage Marketing"), // Added onClick
      },
      {
        name: "Manage Sales",
        key: "manage-sales",
        icon: <Icon fontSize="small">trending_up</Icon>,
        route: "/manage/sales",
        component: (
          <ProtectedRoute
            allowedRoles={["ManageSales:full access", "ManageSales:read"]}
          >
            <ManageSales />
          </ProtectedRoute>
        ),
        onClick: () => handleManageButtonClick("Manage Sales"), // Added onClick
      },
    ],
  },
  {
    type: "collapse",
    name: "Profile",
    key: "profile",
    icon: <Icon fontSize="small">person_pin</Icon>,
    route: "/profile",
    component: <ProfilePage />,
  },
  {
    type: "collapse",
    name: "Financial Overview",
    key: "financial-overview",
    icon: <Icon fontSize="small">bar_chart</Icon>,
    route: "/financial-overview",
    component: <Dashboard />,
  },
  {
    type: "collapse",
    name: "Customer",
    key: "customer",
    icon: <Icon fontSize="small">person_pin</Icon>,
    route: "/customer",
    component: <Customer />,
  },
  {
    type: "collapse",
    name: "Sales And Marketing",
    key: "sales",
    icon: <Icon fontSize="small">storefront</Icon>,
    route: "/sales",
    component: <DashboardPage />,
  },
  {
    type: "collapse",
    name: "Logout",
    key: "logout",
    route: "/logout",
    icon: <Icon fontSize="small">exit_to_app</Icon>,
    component: <Logout />,
  },
];

export default routes;
