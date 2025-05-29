/**
=========================================================
* Manage Leave Page with Firebase Integration
=========================================================
*
* Adapted from ManageAccount.js
* Displays leave applications from Firestore with options to accept or reject
* Styled to match ManageAccount with consistent form and card designs
* No add leave functionality
*/

// React and MUI imports
import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import { db, auth } from "../manage-employee/firebase";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import Icon from "@mui/material/Icon";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Context
import { useMaterialUIController } from "context";

// Icons
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

const ManageLeave = () => {
  const [leaves, setLeaves] = useState([]);
  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;
  const [userRoles, setUserRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { leaveId, action: "approve" or "reject" }

  // Common styles from ManageAccount
  const formContainerStyle = {
    backgroundColor: "#fff",
    borderRadius: "15px",
    boxShadow: "0 0 20px rgba(0, 0, 0, 0.2)",
    padding: "10px 20px",
    width: "90%",
    maxWidth: "500px",
    maxHeight: "80vh",
    overflowY: "auto",
    textAlign: "center",
    margin: "auto",
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 1200,
    transition: "transform 0.2s",
  };

  const formButtonStyle = {
    padding: "10px",
    borderRadius: "10px",
    margin: "10px",
    border: "none",
    color: "white",
    cursor: "pointer",
    backgroundColor: "#4caf50",
    width: "40%",
    fontSize: "14px",
  };

  const formHeadingStyle = {
    fontSize: "large",
    textAlign: "center",
    color: "#327c35",
    margin: "10px 0",
  };

  // Fetch user roles
  useEffect(() => {
    const fetchUserRoles = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const q = query(collection(db, "users"), where("email", "==", user.email));
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
    userRoles.includes("ManageEmployee:read") && !userRoles.includes("ManageEmployee:full access");
  const hasAccess =
    userRoles.includes("ManageEmployee:read") || userRoles.includes("ManageEmployee:full access");

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
      console.error("Error fetching leave data:", error);
      setFetchError("Failed to fetch leave data. Please try again.");
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
    const pendingLeaves = leaves.filter((leave) => leave.status === "Pending").length;
    const approvedLeaves = leaves.filter((leave) => leave.status === "Approved").length;
    const rejectedLeaves = leaves.filter((leave) => leave.status === "Rejected").length;

    return { totalLeaves, pendingLeaves, approvedLeaves, rejectedLeaves };
  };

  // Handle leave action (approve or reject)
  const handleLeaveAction = (leave, action) => {
    setConfirmAction({ leaveId: leave.id, action });
  };

  // Confirm leave action
  const confirmLeaveAction = async () => {
    if (!confirmAction) return;

    const { leaveId, action } = confirmAction;
    const status = action === "approve" ? "Approved" : "Rejected";

    try {
      await updateDoc(doc(db, "leaveApplications", leaveId), { status });
      setLeaves((prev) =>
        prev.map((leave) =>
          leave.id === leaveId ? { ...leave, status } : leave
        )
      );
      setConfirmAction(null);
    } catch (error) {
      console.error(`Error updating leave status:`, error);
      alert(`Failed to ${action} leave. Please try again.`);
    }
  };

  // Format Firestore timestamp to readable date
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  // Render loading state
  if (loadingRoles || loadingData) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>Loading...</MDTypography>
      </Box>
    );
  }

  // Render access denied
  if (!hasAccess) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>
          You do not have permission to view this page.
        </MDTypography>
      </Box>
    );
  }

  // Render fetch error
  if (fetchError) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <MDTypography variant="h6" color="error">{fetchError}</MDTypography>
      </Box>
    );
  }

  const { totalLeaves, pendingLeaves, approvedLeaves, rejectedLeaves } = calculateLeaveMetrics();

  return (
    <Box sx={{ backgroundColor: darkMode ? "#212121" : "#f3f3f3", minHeight: "100vh" }}>
      <DashboardNavbar
        absolute
        light={!darkMode}
        sx={{
          backgroundColor: darkMode ? "rgba(33, 33, 33, 0.9)" : "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          zIndex: 1100,
          padding: "0 16px",
          minHeight: "60px",
          top: "8px",
          left: { xs: "0", md: miniSidenav ? "80px" : "250px" },
          width: { xs: "100%", md: miniSidenav ? "calc(100% - 80px)" : "calc(100% - 250px)" },
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
                        <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                          <span>Total Leaves: </span>
                          <span style={{ fontWeight: "bold" }}>{totalLeaves}</span>
                        </MDTypography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                          <span>Pending Leaves: </span>
                          <span style={{ fontWeight: "bold" }}>{pendingLeaves}</span>
                        </MDTypography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                          <span>Approved Leaves: </span>
                          <span style={{ fontWeight: "bold" }}>{approvedLeaves}</span>
                        </MDTypography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                          <span>Rejected Leaves: </span>
                          <span style={{ fontWeight: "bold" }}>{rejectedLeaves}</span>
                        </MDTypography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
                <Grid container spacing={3}>
                  {leaves.length === 0 ? (
                    <Grid item xs={12}>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
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
                                leave.status === "Approved"
                                  ? "#4caf50"
                                  : leave.status === "Rejected"
                                  ? "#F44336"
                                  : "#FFC107",
                              borderRadius: { xs: "8px 8px 0 0", sm: "8px 0 0 8px" },
                              marginRight: { sm: "16px" },
                              marginBottom: { xs: "16px", sm: 0 },
                              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                            }}
                          >
                            <MDTypography
                              variant="body2"
                              color="white"
                              sx={{ fontWeight: 700, fontSize: "1rem", textTransform: "uppercase" }}
                            >
                              {leave.status}
                            </MDTypography>
                          </Box>
                          <Box sx={{ flexGrow: 1, width: { xs: "100%", sm: "auto" } }}>
                            <CardContent>
                              <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                  <MDTypography
                                    variant="body2"
                                    color={darkMode ? "white" : "textSecondary"}
                                    sx={{ mb: 1 }}
                                  >
                                    <span>Employee ID: </span>
                                    <span style={{ fontWeight: "bold" }}>{leave.employeeId}</span>
                                  </MDTypography>
                                  <MDTypography
                                    variant="body2"
                                    color={darkMode ? "white" : "textSecondary"}
                                    sx={{ mb: 1 }}
                                  >
                                    <span>Name: </span>
                                    <span style={{ fontWeight: "bold" }}>{leave.name}</span>
                                  </MDTypography>
                                  <MDTypography
                                    variant="body2"
                                    color={darkMode ? "white" : "textSecondary"}
                                    sx={{ mb: 1 }}
                                  >
                                    <span>Leave Type: </span>
                                    <span style={{ fontWeight: "bold" }}>{leave.leaveType}</span>
                                  </MDTypography>
                                  <MDTypography
                                    variant="body2"
                                    color={darkMode ? "white" : "textSecondary"}
                                    sx={{ mb: 1 }}
                                  >
                                    <span>Start Date: </span>
                                    <span style={{ fontWeight: "bold" }}>{formatDate(leave.startDate)}</span>
                                  </MDTypography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <MDTypography
                                    variant="body2"
                                    color={darkMode ? "white" : "textSecondary"}
                                    sx={{ mb: 1 }}
                                  >
                                    <span>End Date: </span>
                                    <span style={{ fontWeight: "bold" }}>{formatDate(leave.endDate)}</span>
                                  </MDTypography>
                                  <MDTypography
                                    variant="body2"
                                    color={darkMode ? "white" : "textSecondary"}
                                    sx={{ mb: 1 }}
                                  >
                                    <span>Days: </span>
                                    <span style={{ fontWeight: "bold" }}>
                                      {leave.numberOfDays} {leave.halfDay ? "(Half Day)" : ""}
                                    </span>
                                  </MDTypography>
                                  <MDTypography
                                    variant="body2"
                                    color={darkMode ? "white" : "textSecondary"}
                                    sx={{ mb: 1 }}
                                  >
                                    <span>Reason: </span>
                                    <span style={{ fontWeight: "bold" }}>{leave.reason}</span>
                                  </MDTypography>
                                  <MDTypography
                                    variant="body2"
                                    color={darkMode ? "white" : "textSecondary"}
                                    sx={{ mb: 1 }}
                                  >
                                    <span>Applied Date: </span>
                                    <span style={{ fontWeight: "bold" }}>{formatDate(leave.appliedDate)}</span>
                                  </MDTypography>
                                </Grid>
                              </Grid>
                            </CardContent>
                            {!isReadOnly && leave.status === "Pending" && (
                              <CardActions
                                sx={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 1,
                                  justifyContent: { xs: "space-between", sm: "flex-end" },
                                  alignItems: "center",
                                  padding: "8px 16px",
                                }}
                              >
                                <MDButton
                                  variant="gradient"
                                  color="success"
                                  onClick={() => handleLeaveAction(leave, "approve")}
                                  sx={{
                                    flex: { xs: "1 1 calc(50% - 8px)", sm: "0 0 auto" },
                                    minWidth: { xs: "100px", sm: "100px" },
                                    maxWidth: { xs: "calc(50% - 8px)", sm: "100px" },
                                    padding: "8px 16px",
                                    fontSize: "14px",
                                  }}
                                >
                                  <CheckIcon fontSize="medium" /> Approve
                                </MDButton>
                                <MDButton
                                  variant="gradient"
                                  color="error"
                                  onClick={() => handleLeaveAction(leave, "reject")}
                                  sx={{
                                    flex: { xs: "1 1 calc(50% - 8px)", sm: "0 0 auto" },
                                    minWidth: { xs: "100px", sm: "100px" },
                                    maxWidth: { xs: "calc(50% - 8px)", sm: "100px" },
                                    padding: "8px 16px",
                                    fontSize: "14px",
                                  }}
                                >
                                  <CloseIcon fontSize="medium" /> Reject
                                </MDButton>
                              </CardActions>
                            )}
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
      {!isReadOnly && confirmAction && (
        <Box sx={{ ...formContainerStyle, display: "block" }}>
          <Typography sx={formHeadingStyle}>
            Confirm {confirmAction.action === "approve" ? "Approval" : "Rejection"} of Leave
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <button
              style={formButtonStyle}
              type="button"
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </button>
            <button
              style={{ ...formButtonStyle, backgroundColor: "#1976d2" }}
              type="button"
              onClick={confirmLeaveAction}
            >
              Confirm
            </button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ManageLeave;
