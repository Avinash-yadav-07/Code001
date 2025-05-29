import React, { useState, useEffect, useCallback } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import { db, auth } from "../manage-employee/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useMaterialUIController } from "context";

const statuses = ["Pending", "Approved", "Rejected"];

const ManageLeave = () => {
  const [leaves, setLeaves] = useState([]);
  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;
  const [userRoles, setUserRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Fetch user roles
  useEffect(() => {
    const fetchUserRoles = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const q = query(
            collection(db, "users"),
            where("email", "==", user.email)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0].data();
            setUserRoles(userDoc.roles || []);
          } else {
            console.error("User not found in Firestore");
            setUserRoles([]);
          }
        } catch (error) {
          console.error("Error fetching user roles:", error);
          setUserRoles([]);
        }
      } else {
        setUserRoles([]);
      }
      setLoadingRoles(false);
    };

    fetchUserRoles();
  }, []);

  const isReadOnly =
    userRoles.includes("ManageLeave:read") &&
    !userRoles.includes("ManageLeave:full access");
  const hasAccess =
    userRoles.includes("ManageLeave:read") ||
    userRoles.includes("ManageLeave:full access");

  // Fetch leave applications
  const fetchLeaves = useCallback(async () => {
    try {
      setFetchError(null);
      setLoadingData(true);
      const user = auth.currentUser;
      if (!user) {
        console.error("No authenticated user");
        setFetchError("No authenticated user. Please log in.");
        return;
      }

      const leavesSnapshot = await getDocs(collection(db, "leaveApplications"));
      const leavesData = leavesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setLeaves(leavesData);
    } catch (error) {
      console.error("Error fetching leave applications:", error);
      setFetchError("Failed to fetch leave applications. Please try again.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Trigger data fetch when roles are loaded
  useEffect(() => {
    if (!loadingRoles) {
      fetchLeaves();
    }
  }, [loadingRoles, fetchLeaves]);

  // Calculate leave metrics
  const calculateLeaveMetrics = () => {
    const totalLeaves = leaves.length;
    const pendingLeaves = leaves.filter(
      (leave) => leave.status === "Pending"
    ).length;
    const totalLeaveDays = leaves.reduce(
      (sum, leave) => sum + (Number(leave.numberOfDays) || 0),
      0
    );
    const averageLeaveDays =
      leaves.length > 0 ? totalLeaveDays / leaves.length : 0;

    return { totalLeaves, pendingLeaves, totalLeaveDays, averageLeaveDays };
  };

  // Format Firestore timestamp to readable date
  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return "N/A";
    return timestamp.toDate().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Render loading state
  if (loadingRoles || loadingData) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>
          Loading...
        </MDTypography>
      </Box>
    );
  }

  // Render access denied
  if (!hasAccess) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>
          You do not have permission to view this page.
        </MDTypography>
      </Box>
    );
  }

  // Render fetch error
  if (fetchError) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <MDTypography variant="h6" color="error">
          {fetchError}
        </MDTypography>
      </Box>
    );
  }

  const { totalLeaves, pendingLeaves, totalLeaveDays, averageLeaveDays } =
    calculateLeaveMetrics();

  return (
    <Box
      sx={{
        backgroundColor: darkMode ? "#212121" : "#f3f3f3",
        minHeight: "100vh",
      }}
    >
      <DashboardNavbar
        absolute
        light={!darkMode}
        sx={{
          backgroundColor: darkMode
            ? "rgba(33, 33, 33, 0.9)"
            : "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          zIndex: 1100,
          padding: "0 16px",
          minHeight: "60px",
          top: "8px",
          left: { xs: "0", md: miniSidenav ? "80px" : "250px" },
          width: {
            xs: "100%",
            md: miniSidenav ? "calc(100% - 80px)" : "calc(100% - 250px)",
          },
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      />
      <MDBox
        p={3}
        sx={{
          marginLeft: { xs: "0", md: miniSidenav ? "80px" : "250px" },
          marginTop: { xs: "140px", md: "100px" },
          backgroundColor: darkMode ? "#212121" : "#f3f3f3",
          minHeight: "calc(100vh - 80px)",
          paddingTop: { xs: "32px", md: "24px" },
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor={darkMode ? "dark" : "info"}
                borderRadius="lg"
                coloredShadow={darkMode ? "dark" : "info"}
              >
                <MDTypography variant="h6" color="white">
                  Leave Management
                </MDTypography>
              </MDBox>
              <MDBox px={2} pb={2}>
                <Card
                  sx={{
                    background: darkMode
                      ? "linear-gradient(135deg, #424242 0%, #212121 100%)"
                      : "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
                    borderRadius: "12px",
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                    padding: "20px",
                    marginBottom: "16px",
                  }}
                >
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <MDTypography
                          variant="body2"
                          color={darkMode ? "white" : "textSecondary"}
                          sx={{ mb: 1 }}
                        >
                          <span>Total Leaves Applied: </span>
                          <span style={{ fontWeight: "bold" }}>
                            {totalLeaves}
                          </span>
                        </MDTypography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <MDTypography
                          variant="body2"
                          color={darkMode ? "white" : "textSecondary"}
                          sx={{ mb: 1 }}
                        >
                          <span>Pending Leaves: </span>
                          <span style={{ fontWeight: "bold" }}>
                            {pendingLeaves}
                          </span>
                        </MDTypography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <MDTypography
                          variant="body2"
                          color={darkMode ? "white" : "textSecondary"}
                          sx={{ mb: 1 }}
                        >
                          <span>Total Leave Days: </span>
                          <span style={{ fontWeight: "bold" }}>
                            {totalLeaveDays}
                          </span>
                        </MDTypography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <MDTypography
                          variant="body2"
                          color={darkMode ? "white" : "textSecondary"}
                          sx={{ mb: 1 }}
                        >
                          <span>Average Leave Days: </span>
                          <span style={{ fontWeight: "bold" }}>
                            {averageLeaveDays.toFixed(2)}
                          </span>
                        </MDTypography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
                <Grid container spacing={3}>
                  {leaves.length === 0 ? (
                    <Grid item xs={12}>
                      <MDTypography
                        variant="body2"
                        color={darkMode ? "white" : "textSecondary"}
                      >
                        No leave applications available.
                      </MDTypography>
                    </Grid>
                  ) : (
                    leaves.map((leave) => (
                      <Grid item xs={12} key={leave.id}>
                        <Card
                          sx={{
                            background: darkMode
                              ? "linear-gradient(135deg, #424242 0%, #212121 100%)"
                              : "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
                            borderRadius: "12px",
                            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                            padding: "20px",
                            transition: "0.3s ease-in-out",
                            "&:hover": {
                              boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
                              transform: "scale(1.02)",
                            },
                            display: "flex",
                            flexDirection: { xs: "column", sm: "row" },
                          }}
                        >
                          <Box
                            sx={{
                              width: { xs: "100%", sm: "120px" },
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor:
                                leave.status === "Pending"
                                  ? "#FFCA28"
                                  : leave.status === "Approved"
                                  ? "#4CAF50"
                                  : "#F44336",
                              borderRadius: {
                                xs: "8px 8px 0 0",
                                sm: "8px 0 0 8px",
                              },
                              marginRight: { sm: "16px" },
                              marginBottom: { xs: "16px", sm: 0 },
                              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                            }}
                          >
                            <MDTypography
                              variant="body2"
                              color="white"
                              sx={{
                                fontWeight: 700,
                                fontSize: "1rem",
                                textTransform: "uppercase",
                              }}
                            >
                              {leave.status}
                            </MDTypography>
                          </Box>
                          <Box
                            sx={{
                              flexGrow: 1,
                              width: { xs: "100%", sm: "auto" },
                            }}
                          >
                            <CardContent>
                              <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                  <MDTypography
                                    variant="body2"
                                    color={darkMode ? "white" : "textSecondary"}
                                    sx={{ mb: 1 }}
                                  >
                                    <span>Employee ID: </span>
                                    <span style={{ fontWeight: "bold" }}>
                                      {leave.employeeId}
                                    </span>
                                  </MDTypography>
                                  <MDTypography
                                    variant="body2"
                                    color={darkMode ? "white" : "textSecondary"}
                                    sx={{ mb: 1 }}
                                  >
                                    <span>Name: </span>
                                    <span style={{ fontWeight: "bold" }}>
                                      {leave.name}
                                    </span>
                                  </MDTypography>
                                  <MDTypography
                                    variant="body2"
                                    color={darkMode ? "white" : "textSecondary"}
                                    sx={{ mb: 1 }}
                                  >
                                    <span>Leave Type: </span>
                                    <span style={{ fontWeight: "bold" }}>
                                      {leave.leaveType}
                                    </span>
                                  </MDTypography>
                                  <MDTypography
                                    variant="body2"
                                    color={darkMode ? "white" : "textSecondary"}
                                    sx={{ mb: 1 }}
                                  >
                                    <span>Number of Days: </span>
                                    <span style={{ fontWeight: "bold" }}>
                                      {leave.numberOfDays}
                                    </span>
                                  </MDTypography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <MDTypography
                                    variant="body2"
                                    color={darkMode ? "white" : "textSecondary"}
                                    sx={{ mb: 1 }}
                                  >
                                    <span>Applied Date: </span>
                                    <span style={{ fontWeight: "bold" }}>
                                      {formatDate(leave.appliedDate)}
                                    </span>
                                  </MDTypography>
                                  <MDTypography
                                    variant="body2"
                                    color={darkMode ? "white" : "textSecondary"}
                                    sx={{ mb: 1 }}
                                  >
                                    <span>Start Date: </span>
                                    <span style={{ fontWeight: "bold" }}>
                                      {formatDate(leave.startDate)}
                                    </span>
                                  </MDTypography>
                                  <MDTypography
                                    variant="body2"
                                    color={darkMode ? "white" : "textSecondary"}
                                    sx={{ mb: 1 }}
                                  >
                                    <span>End Date: </span>
                                    <span style={{ fontWeight: "bold" }}>
                                      {formatDate(leave.endDate)}
                                    </span>
                                  </MDTypography>
                                  <MDTypography
                                    variant="body2"
                                    color={darkMode ? "white" : "textSecondary"}
                                    sx={{ mb: 1 }}
                                  >
                                    <span>Reason: </span>
                                    <span style={{ fontWeight: "bold" }}>
                                      {leave.reason || "No reason provided"}
                                    </span>
                                  </MDTypography>
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Box>
                        </Card>
                      </Grid>
                    ))
                  )}
                </Grid>
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Box
        sx={{
          marginLeft: { xs: "0", md: miniSidenav ? "80px" : "250px" },
          backgroundColor: darkMode ? "#212121" : "#f3f3f3",
        }}
      >
        <Footer />
      </Box>
    </Box>
  );
};

export default ManageLeave;
