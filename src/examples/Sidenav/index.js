import { useEffect, useState } from "react";
import { useLocation, NavLink } from "react-router-dom";
import PropTypes from "prop-types";
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Icon from "@mui/material/Icon";
import Collapse from "@mui/material/Collapse";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import SidenavCollapse from "examples/Sidenav/SidenavCollapse";
import SidenavRoot from "examples/Sidenav/SidenavRoot";
import sidenavLogoLabel from "examples/Sidenav/styles/sidenav";

import {
  useMaterialUIController,
  setMiniSidenav,
  setTransparentSidenav,
  setWhiteSidenav,
} from "context";

function Sidenav({ color, brand, brandName, routes, ...rest }) {
  const [controller, dispatch] = useMaterialUIController();
  const { miniSidenav, transparentSidenav, whiteSidenav, darkMode } =
    controller;
  const location = useLocation();
  const collapseName = location.pathname.replace("/", "");

  const [openDropdowns, setOpenDropdowns] = useState({});

  const handleToggleDropdown = (key) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  let textColor = "white";
  if (transparentSidenav || (whiteSidenav && !darkMode)) {
    textColor = "dark";
  } else if (whiteSidenav && darkMode) {
    textColor = "inherit";
  }

  const closeSidenav = () => setMiniSidenav(dispatch, true);

  useEffect(() => {
    function handleMiniSidenav() {
      setMiniSidenav(dispatch, window.innerWidth < 1200);
      setTransparentSidenav(
        dispatch,
        window.innerWidth < 1200 ? false : transparentSidenav
      );
      setWhiteSidenav(
        dispatch,
        window.innerWidth < 1200 ? false : whiteSidenav
      );
    }

    window.addEventListener("resize", handleMiniSidenav);
    handleMiniSidenav();
    return () => window.removeEventListener("resize", handleMiniSidenav);
  }, [dispatch, location]);

  const renderRoutes = (routesArray) =>
    routesArray.map(
      ({ type, name, icon, title, noCollapse, key, href, route, collapse }) => {
        if (type === "collapse") {
          const isActive = key === collapseName;
          const hasActiveSubRoute = collapse?.some(
            (sub) => sub.route === `/${collapseName}`
          );

          if (collapse) {
            return (
              <div key={key}>
                <SidenavCollapse
                  name={name}
                  icon={icon}
                  active={isActive || (openDropdowns[key] && hasActiveSubRoute)}
                  noCollapse={noCollapse}
                  onClick={() => handleToggleDropdown(key)}
                  sx={{
                    "&.MuiListItem-root.Mui-selected": {
                      backgroundColor: "#1976d2", // Blue background (Material-UI blue-500 equivalent)
                      color: "white",
                      "&:hover": {
                        backgroundColor: "#1565c0", // Darker shade on hover
                      },
                    },
                  }}
                >
                  <Icon sx={{ ml: "auto" }}>
                    {openDropdowns[key] ? "expand_less" : "expand_more"}
                  </Icon>
                </SidenavCollapse>
                <Collapse in={openDropdowns[key]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {collapse.map((subRoute) => (
                      <NavLink
                        key={subRoute.key}
                        to={subRoute.route}
                        style={{ textDecoration: "none" }}
                      >
                        <SidenavCollapse
                          icon={subRoute.icon}
                          name={subRoute.name}
                          active={subRoute.route === location.pathname}
                          sx={{
                            pl: 2,
                            "&.MuiListItem-root.Mui-selected": {
                              backgroundColor: "#1976d2", // Blue background for sub-items
                              color: "white",
                              "&:hover": {
                                backgroundColor: "#1565c0",
                              },
                            },
                          }}
                        />
                      </NavLink>
                    ))}
                  </List>
                </Collapse>
              </div>
            );
          } else if (href) {
            return (
              <Link
                href={href}
                key={key}
                target="_blank"
                rel="noreferrer"
                sx={{ textDecoration: "none" }}
              >
                <SidenavCollapse
                  name={name}
                  icon={icon}
                  active={key === collapseName}
                  noCollapse={noCollapse}
                  sx={{
                    "&.MuiListItem-root.Mui-selected": {
                      backgroundColor: "#1976d2",
                      color: "white",
                      "&:hover": {
                        backgroundColor: "#1565c0",
                      },
                    },
                  }}
                />
              </Link>
            );
          } else {
            return (
              <NavLink key={key} to={route}>
                <SidenavCollapse
                  name={name}
                  icon={icon}
                  active={key === collapseName}
                  sx={{
                    "&.MuiListItem-root.Mui-selected": {
                      backgroundColor: "#1976d2",
                      color: "white",
                      "&:hover": {
                        backgroundColor: "#1565c0",
                      },
                    },
                  }}
                />
              </NavLink>
            );
          }
        } else if (type === "title") {
          return (
            <MDTypography
              key={key}
              color={textColor}
              display="block"
              variant="caption"
              fontWeight="bold"
              textTransform="uppercase"
              pl={3}
              mt={2}
              mb={1}
              ml={1}
            >
              {title}
            </MDTypography>
          );
        } else if (type === "divider") {
          return (
            <Divider
              key={key}
              light={!darkMode || (darkMode && whiteSidenav)}
            />
          );
        }

        return null;
      }
    );

  return (
    <SidenavRoot
      {...rest}
      variant="permanent"
      ownerState={{ transparentSidenav, whiteSidenav, miniSidenav, darkMode }}
    >
      <MDBox pt={3} pb={1} px={4} textAlign="center">
        <MDBox component={NavLink} to="/" display="flex" alignItems="center">
          {brand && (
            <MDBox component="img" src={brand} alt="Brand" width="2rem" />
          )}
          <MDBox
            width={!brandName && "100%"}
            sx={(theme) => sidenavLogoLabel(theme, { miniSidenav })}
          >
            <MDTypography
              component="h6"
              variant="button"
              fontWeight="medium"
              color={textColor}
            >
              {brandName}
            </MDTypography>
          </MDBox>
        </MDBox>
      </MDBox>
      <Divider light={!darkMode || (darkMode && whiteSidenav)} />
      <List>{renderRoutes(routes)}</List>
      <MDBox p={2} mt="auto"></MDBox>
    </SidenavRoot>
  );
}

Sidenav.defaultProps = {
  color: "info",
  brand: "",
};

Sidenav.propTypes = {
  color: PropTypes.oneOf([
    "primary",
    "secondary",
    "info",
    "success",
    "warning",
    "error",
    "dark",
  ]),
  brand: PropTypes.string,
  brandName: PropTypes.string.isRequired,
  routes: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default Sidenav;
