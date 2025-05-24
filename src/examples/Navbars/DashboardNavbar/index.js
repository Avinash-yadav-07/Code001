import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import Icon from "@mui/material/Icon";
import MDBox from "components/MDBox";
import MDInput from "components/MDInput";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import Breadcrumbs from "examples/Breadcrumbs";
import NotificationItem from "examples/Items/NotificationItem";
import {
  navbar,
  navbarContainer,
  navbarRow,
  navbarIconButton,
  navbarMobileMenu,
} from "examples/Navbars/DashboardNavbar/styles";
import {
  useMaterialUIController,
  setTransparentNavbar,
  setMiniSidenav,
  setOpenConfigurator,
} from "context";
import { auth, db } from "../../../layouts/manage-employee/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

function DashboardNavbar({ absolute, light, isMini }) {
  const [navbarType, setNavbarType] = useState("fixed");
  const [controller, dispatch] = useMaterialUIController();
  const { miniSidenav, transparentNavbar, fixedNavbar, openConfigurator, darkMode } = controller;
  const [openMenu, setOpenMenu] = useState(false);
  const [openAccountMenu, setOpenAccountMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [employeeName, setEmployeeName] = useState("");
  const route = useLocation().pathname.split("/").slice(1);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        const fetchEmployeeName = async () => {
          const q = query(collection(db, "employees"), where("email", "==", user.email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            setEmployeeName(querySnapshot.docs[0].data().name || "Unnamed Employee");
          } else {
            setEmployeeName("Unnamed Employee");
          }
        };
        fetchEmployeeName();
      } else {
        setEmployeeName("");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    function handleTransparentNavbar() {
      setTransparentNavbar(dispatch, (fixedNavbar && window.scrollY === 0) || !fixedNavbar);
    }

    window.addEventListener("scroll", handleTransparentNavbar);
    handleTransparentNavbar();
    return () => window.removeEventListener("scroll", handleTransparentNavbar);
  }, [dispatch, fixedNavbar]);

  const handleMiniSidenav = () => setMiniSidenav(dispatch, !miniSidenav);
  const handleConfiguratorOpen = () => setOpenConfigurator(dispatch, !openConfigurator);
  const handleOpenMenu = (event) => setOpenMenu(event.currentTarget);
  const handleCloseMenu = () => setOpenMenu(false);
  const handleOpenAccountMenu = (event) => setOpenAccountMenu(event.currentTarget);
  const handleCloseAccountMenu = () => setOpenAccountMenu(false);

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        console.log("Signed out successfully");
        setCurrentUser(null);
        setEmployeeName("");
        handleCloseAccountMenu();
        navigate("/authentication/sign-in/basic");
      })
      .catch((error) => {
        console.error("Sign out error:", error);
      });
  };

  const renderMenu = () => (
    <Menu
      anchorEl={openMenu}
      anchorReference={null}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      open={Boolean(openMenu)}
      onClose={handleCloseMenu}
      sx={{ mt: 2 }}
    >
      <NotificationItem icon={<Icon>email</Icon>} title="Check new messages" />
      <NotificationItem icon={<Icon>podcasts</Icon>} title="Manage Podcast sessions" />
      <NotificationItem icon={<Icon>shopping_cart</Icon>} title="Payment successfully completed" />
    </Menu>
  );

  const renderAccountMenu = () => (
    <Menu
      anchorEl={openAccountMenu}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      open={Boolean(openAccountMenu)}
      onClose={handleCloseAccountMenu}
      sx={{ mt: 1 }}
    >
      <MDBox p={2}>
        {currentUser ? (
          <>
            <MDTypography variant="body2" fontWeight="bold">
              {employeeName}
            </MDTypography>
            <MDTypography variant="body2" color="textSecondary">
              {currentUser.email}
            </MDTypography>
            <MDButton
              variant="contained"
              color="error"
              size="small"
              onClick={handleSignOut}
              sx={{ mt: 1 }}
            >
              Sign Out
            </MDButton>
          </>
        ) : (
          <MDTypography variant="body2">Not logged in</MDTypography>
        )}
      </MDBox>
    </Menu>
  );

  const iconsStyle = ({ palette: { dark, white } }) => ({
    color: darkMode ? white.main : dark.main,
  });

  return (
    <AppBar
      position="fixed"
      color="inherit"
      sx={(theme) => ({
        ...navbar(theme, { transparentNavbar, absolute, light, darkMode }),
        left: { xs: "0", md: miniSidenav ? "80px" : "260px" },
        width: {
          xs: "calc(100% - 32px)",
          md: miniSidenav ? "calc(100% - 112px)" : "calc(100% - 292px)",
        },
        margin: { xs: "0 16px", md: miniSidenav ? "0 16px" : "0 16px" },
        backgroundColor: darkMode ? "rgba(12, 55, 79, 0.9)" : "rgba(255, 255, 255, 0.9)",
        backdropFilter: transparentNavbar ? "none" : "blur(10px)",
        padding: "0 8px",
        minHeight: "80px",
        top: "8px",
        zIndex: 1100,
      })}
    >
      <Toolbar sx={(theme) => navbarContainer(theme)}>
        <MDBox color="inherit" mb={{ xs: 1, md: 0 }} sx={(theme) => navbarRow(theme, { isMini })}>
          <Breadcrumbs
            icon="home"
            title={route[route.length - 1]}
            route={route}
            light={light}
            darkMode={darkMode}
          />
        </MDBox>
        {isMini ? null : (
          <MDBox sx={(theme) => navbarRow(theme, { isMini })}>
            <MDBox pr={1}>
              <MDInput label="Search here" />
            </MDBox>
            <MDBox color="inherit">
              <IconButton
                sx={navbarIconButton}
                size="small"
                disableRipple
                onClick={handleOpenAccountMenu}
              >
                <Icon sx={iconsStyle}>account_circle</Icon>
              </IconButton>
              <IconButton
                size="small"
                disableRipple
                color="inherit"
                sx={navbarMobileMenu}
                onClick={handleMiniSidenav}
              >
                <Icon sx={iconsStyle} fontSize="medium">
                  {miniSidenav ? "menu_open" : "menu"}
                </Icon>
              </IconButton>
              <IconButton
                size="small"
                disableRipple
                color="inherit"
                sx={navbarIconButton}
                onClick={handleConfiguratorOpen}
              >
                <Icon sx={iconsStyle}>settings</Icon>
              </IconButton>
              <IconButton
                size="small"
                disableRipple
                color="inherit"
                sx={navbarIconButton}
                aria-controls="notification-menu"
                aria-haspopup="true"
                variant="contained"
                onClick={handleOpenMenu}
              >
                <Icon sx={iconsStyle}>notifications</Icon>
              </IconButton>
              {renderMenu()}
              {renderAccountMenu()}
            </MDBox>
          </MDBox>
        )}
      </Toolbar>
    </AppBar>
  );
}

DashboardNavbar.defaultProps = {
  absolute: false,
  light: false,
  isMini: false,
};

DashboardNavbar.propTypes = {
  absolute: PropTypes.bool,
  light: PropTypes.bool,
  isMini: PropTypes.bool,
};

export default DashboardNavbar;
