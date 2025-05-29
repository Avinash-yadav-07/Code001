/**
=========================================================
* Modern Profile Page with Firebase Integration
=========================================================
*
* Adapted from ManageLeave.js
* Displays user profile and leave applications with consistent UI
* Styled to match ManageLeave with larger cards and modern design
* Includes edit profile and leave application functionality
*/

// React and MUI imports
import React, { useState, useEffect, useCallback } from "react";
import {
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import TextField from "@mui/material/TextField";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

// Firebase Imports
import { db, auth } from "../manage-employee/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Context
import { useMaterialUIController } from "context";

// Animation
import { motion } from "framer-motion";

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

// Form styles from ManageLeave
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

const formInputStyle = {
  display: "block",
  width: "100%",
  padding: "6px",
  boxSizing: "border-box",
  border: "1px solid #ddd",
  borderRadius: "5px",
  fontSize: "12px",
  marginBottom: "10px",
};

const formSelectStyle = {
  ...formInputStyle,
  padding: "8px",
  borderRadius: "5px",
  height: "32px",
};

const formCheckboxStyle = {
  display: "inline-block",
  width: "auto",
  marginRight: "5px",
};

const formLabelStyle = {
  fontSize: "14px",
  display: "block",
  width: "100%",
  marginTop: "6px",
  marginBottom: "4px",
  textAlign: "left",
  color: "#555555",
  fontWeight: "bold",
};

function ProfilePage() {
  const [controller] = useMaterialUIController();
  const { darkMode, miniSidenav } = controller;

  const [userData, setUserData] = useState({
    name: "",
    email: "",
    employeeId: "",
    designation: "",
    department: "",
    joiningDate: "",
    roles: [],
    status: "",
    emailVerified: false,
  });
  const [editOpen, setEditOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [formData, setFormData] = useState({
    designation: "",
    department: "",
    status: "",
  });
  const [leaveFormData, setLeaveFormData] = useState({
    email: "",
    department: "",
    leaveType: "",
    startDate: null,
    endDate: null,
    employeeId: "",
    name: "",
    numberOfDays: 0,
    reason: "",
    halfDay: false,
    status: "Pending",
    appliedDate: null,
  });
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [formErrors, setFormErrors] = useState({});
  const [leaves, setLeaves] = useState([]);
  const [leaveMetrics, setLeaveMetrics] = useState({
    totalLeaves: 0,
    approvedLeaves: 0,
    rejectedLeaves: 0,
  });

  // Filter and clean roles
  const filterRoles = (roles) => {
    if (!Array.isArray(roles)) return [];
    const roleSet = new Set();
    roles.forEach((role) => {
      let cleanedRole = role.replace(/:read/gi, "").trim();
      roleSet.add(cleanedRole);
    });
    return Array.from(roleSet);
  };

  // Fetch leave applications
  useEffect(() => {
    if (!userData.employeeId) return;

    const q = query(
      collection(db, "leaveApplications"),
      where("employeeId", "==", userData.employeeId)
    );
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const leaveData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setLeaves(leaveData);

        // Calculate leave metrics for 2025
        const currentYear = 2025;
        const yearlyLeaves = leaveData.filter((leave) => {
          const appliedDate = leave.appliedDate?.toDate
            ? leave.appliedDate.toDate()
            : new Date(leave.appliedDate);
          return appliedDate && appliedDate.getFullYear() === currentYear;
        });
        const totalLeaves = yearlyLeaves.length;
        const approvedLeaves = yearlyLeaves.filter((leave) => leave.status === "Approved").length;
        const rejectedLeaves = yearlyLeaves.filter((leave) => leave.status === "Rejected").length;

        setLeaveMetrics({
          totalLeaves,
          approvedLeaves,
          rejectedLeaves,
        });
      },
      (err) => {
        console.error("Error fetching leave applications:", err);
        setError("Failed to fetch leave applications: " + err.message);
      }
    );

    return () => unsubscribe();
  }, [userData.employeeId]);

  // Calculate days between dates
  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Handle leave form changes
  const handleLeaveFormChange = (event) => {
    const { name, value } = event.target;
    setLeaveFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handle date changes
  const handleDateChange = (name, date) => {
    setLeaveFormData((prevData) => {
      const updatedFormData = {
        ...prevData,
        [name]: date,
      };
      if (name === "startDate" || name === "endDate") {
        return {
          ...updatedFormData,
          numberOfDays: calculateDays(updatedFormData.startDate, updatedFormData.endDate),
        };
      }
      return updatedFormData;
    });
  };

  // Validate leave form
  const validateLeaveForm = () => {
    const errors = {};
    if (!leaveFormData.leaveType) errors.leaveType = "Leave type is required";
    if (!leaveFormData.startDate) errors.startDate = "Start date is required";
    if (!leaveFormData.endDate) errors.endDate = "End date is required";
    if (!leaveFormData.reason.trim()) errors.reason = "Reason is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit leave application
  const handleSubmitLeaveApplication = async (event) => {
    event.preventDefault();
    if (!validateLeaveForm()) return;
    try {
      const leaveData = {
        ...leaveFormData,
        employeeId: userData.employeeId,
        name: userData.name,
        appliedDate: serverTimestamp(),
        status: "Pending",
      };

      await addDoc(collection(db, "leaveApplications"), leaveData);
      setLeaveOpen(false);
      setError("");
      setLeaveFormData({
        email: "",
        department: "",
        leaveType: "",
        startDate: null,
        endDate: null,
        employeeId: "",
        name: "",
        numberOfDays: 0,
        reason: "",
        halfDay: false,
        status: "Pending",
        appliedDate: null,
      });
      setFormErrors({});
    } catch (err) {
      console.error("Error submitting leave application:", err);
      setError("Failed to submit leave application: " + err.message);
    }
  };

  // Fetch user data
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        console.log("Current user email:", user.email);
        try {
          setLoading(true);
          const employeesRef = collection(db, "employees");
          const q = query(employeesRef, where("email", "==", user.email));

          const unsubscribeSnapshot = onSnapshot(
            q,
            (querySnapshot) => {
              if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0];
                const data = docSnap.data();
                console.log("Fetched employee data:", data);
                const rolesArray = Array.isArray(data.roles)
                  ? data.roles
                  : data.roles
                  ? data.roles.split(",").map((role) => role.trim())
                  : [];

                setUserData({
                  name: data.name || "",
                  email: user.email || "",
                  employeeId: data.employeeId || "",
                  designation: data.designation || "",
                  department: data.department || "",
                  joiningDate: data.joiningDate || "",
                  roles: rolesArray,
                  status: data.status || "",
                  emailVerified: user.emailVerified || false,
                });
                setFormData({
                  designation: data.designation || "",
                  department: data.department || "",
                  status: data.status || "",
                });
                setError("");
              } else {
                console.warn("No employee document found for email:", user.email);
                setError(
                  "No profile data found for this email. Please ensure your account is set up or contact the administrator."
                );
                setUserData({
                  name: "",
                  email: user.email,
                  employeeId: "",
                  designation: "",
                  department: "",
                  joiningDate: "",
                  roles: [],
                  status: "",
                  emailVerified: user.emailVerified || false,
                });
              }
              setLoading(false);
            },
            (err) => {
              console.error("Firestore snapshot error:", err);
              setError("Failed to fetch profile data: " + err.message);
              setLoading(false);
            }
          );

          return () => unsubscribeSnapshot();
        } catch (err) {
          console.error("Error setting up Firestore listener:", err);
          setError("Failed to fetch profile data: " + err.message);
          setLoading(false);
        }
      } else {
        console.warn("No user logged in");
        setError("Please log in to view your profile.");
        setLoading(false);
      }
    }, (error) => {
      console.error("Auth state error:", error);
      setError("Authentication error: " + error.message);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Handle edit dialog open/close
  const handleEditOpen = useCallback(() => setEditOpen(true), []);
  const handleEditClose = useCallback(() => {
    setEditOpen(false);
    setFormData({
      designation: userData.designation || "",
      department: userData.department || "",
      status: userData.status || "",
    });
    setFormErrors({});
  }, [userData]);

  // Handle leave dialog open/close
  const handleLeaveOpen = useCallback(() => {
    setLeaveFormData((prev) => ({
      ...prev,
      employeeId: userData.employeeId,
      name: userData.name,
      email: userData.email,
    }));
    setLeaveOpen(true);
  }, [userData]);
  const handleLeaveClose = useCallback(() => {
    setLeaveOpen(false);
    setLeaveFormData({
      email: "",
      department: "",
      leaveType: "",
      startDate: null,
      endDate: null,
      employeeId: "",
      name: "",
      numberOfDays: 0,
      reason: "",
      halfDay: false,
      status: "Pending",
      appliedDate: null,
    });
    setFormErrors({});
  }, []);

  // Handle form changes
  const handleFormChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Validate edit form
  const validateEditForm = () => {
    const errors = {};
    if (!formData.designation.trim()) errors.designation = "Designation is required";
    if (!formData.department.trim()) errors.department = "Department is required";
    if (!formData.status) errors.status = "Status is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit edit form
  const handleFormSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!validateEditForm()) return;
      const user = auth.currentUser;
      if (user && user.email) {
        try {
          const employeesRef = collection(db, "employees");
          const q = query(employeesRef, where("email", "==", user.email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const docRef = querySnapshot.docs[0].ref;
            await updateDoc(docRef, {
              designation: formData.designation,
              department: formData.department,
              status: formData.status,
            });
            setEditOpen(false);
            setError("");
            setFormErrors({});
          } else {
            setError("No employee document found for this email.");
          }
        } catch (err) {
          console.error("Error updating Firestore document:", err);
          setError("Failed to update profile: " + err.message);
        }
      } else {
        setError("No user logged in");
      }
    },
    [formData]
  );

  // Send password reset email
  const handleSendPasswordReset = useCallback(async () => {
    const user = auth.currentUser;
    if (user && user.email) {
      try {
        await sendPasswordResetEmail(auth, user.email);
        setOtpSent(true);
        setError("");
      } catch (err) {
        console.error("Password reset email error:", err);
        setError("Failed to send reset email: " + err.message);
      }
    } else {
      setError("No user logged in");
    }
  }, []);

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>Loading...</MDTypography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <MDTypography variant="h6" color="error">{error}</MDTypography>
      </Box>
    );
  }

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
        <motion.div initial="hidden" animate="visible" variants={cardVariants}>
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
                    Profile Details
                  </MDTypography>
                </MDBox>
                <MDBox px={2} pb={2}>
                  {/* User Info */}
                  <Card
                    sx={{
                      background: darkMode
                        ? "linear-gradient(135deg, #424242 0%, #212121 100%)"
                        : "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
                      borderRadius: "12px",
                      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                      padding: "20px",
                      marginBottom: "16px",
                      transition: "0.3s ease-in-out",
                      "&:hover": {
                        boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
                        transform: "scale(1.02)",
                      },
                    }}
                  >
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                            <span>Employee ID: </span>
                            <span style={{ fontWeight: "bold" }}>{userData.employeeId || "N/A"}</span>
                          </MDTypography>
                          <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                            <span>Name: </span>
                            <span style={{ fontWeight: "bold" }}>{userData.name || "N/A"}</span>
                          </MDTypography>
                          <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                            <span>Email: </span>
                            <span style={{ fontWeight: "bold" }}>{userData.email || "N/A"}</span>
                          </MDTypography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                            <span>Designation: </span>
                            <span style={{ fontWeight: "bold" }}>{userData.designation || "N/A"}</span>
                          </MDTypography>
                          <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                            <span>Department: </span>
                            <span style={{ fontWeight: "bold" }}>{userData.department || "N/A"}</span>
                          </MDTypography>
                          <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                            <span>Status: </span>
                            <span style={{ fontWeight: "bold" }}>{userData.status || "Active"}</span>
                          </MDTypography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Admin Actions */}
                  <Card
                    sx={{
                      background: darkMode
                        ? "linear-gradient(135deg, #424242 0%, #212121 100%)"
                        : "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
                      borderRadius: "12px",
                      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                      padding: "20px",
                      marginBottom: "16px",
                      transition: "0.3s ease-in-out",
                      "&:hover": {
                        boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
                        transform: "scale(1.02)",
                      },
                    }}
                  >
                    <CardContent>
                      <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"} sx={{ mb: 2 }}>
                        Admin Actions
                      </MDTypography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "flex-start" }}>
                        <MDButton
                          variant="gradient"
                          color="success"
                          onClick={handleEditOpen}
                          sx={{
                            minWidth: { xs: "100px", sm: "100px" },
                            padding: "8px 16px",
                            fontSize: "14px",
                          }}
                        >
                          <CheckIcon fontSize="medium" /> Edit Profile
                        </MDButton>
                        <MDButton
                          variant="gradient"
                          color="info"
                          onClick={handleLeaveOpen}
                          sx={{
                            minWidth: { xs: "100px", sm: "100px" },
                            padding: "8px 16px",
                            fontSize: "14px",
                          }}
                        >
                          <CheckIcon fontSize="medium" /> Apply for Leave
                        </MDButton>
                        {!otpSent ? (
                          <MDButton
                            variant="gradient"
                            color="warning"
                            onClick={handleSendPasswordReset}
                            sx={{
                              minWidth: { xs: "100px", sm: "100px" },
                              padding: "8px 16px",
                              fontSize: "14px",
                            }}
                          >
                            <CloseIcon fontSize="medium" /> Reset Password
                          </MDButton>
                        ) : (
                          <MDTypography variant="body2" color="success" sx={{ fontWeight: "500" }}>
                            Password reset email sent! Check your inbox.
                          </MDTypography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Roles & Security */}
                  <Card
                    sx={{
                      background: darkMode
                        ? "linear-gradient(135deg, #424242 0%, #212121 100%)"
                        : "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
                      borderRadius: "12px",
                      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                      padding: "20px",
                      marginBottom: "16px",
                      transition: "0.3s ease-in-out",
                      "&:hover": {
                        boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
                        transform: "scale(1.02)",
                      },
                    }}
                  >
                    <CardContent>
                      <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"} sx={{ mb: 2 }}>
                        Roles & Security
                      </MDTypography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {filterRoles(userData.roles).length > 0 ? (
                          filterRoles(userData.roles).map((role, index) => (
                            <MDTypography
                              key={index}
                              variant="body2"
                              sx={{
                                backgroundColor: "#2196f3",
                                color: "white",
                                padding: "4px 8px",
                                borderRadius: "12px",
                                fontSize: "12px",
                                fontWeight: "500",
                              }}
                            >
                              {role}
                            </MDTypography>
                          ))
                        ) : (
                          <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                            No roles assigned
                          </MDTypography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Leave Metrics */}
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
                            <span style={{ fontWeight: "bold" }}>{leaveMetrics.totalLeaves}</span>
                          </MDTypography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                            <span>Approved Leaves: </span>
                            <span style={{ fontWeight: "bold" }}>{leaveMetrics.approvedLeaves}</span>
                          </MDTypography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                            <span>Rejected Leaves: </span>
                            <span style={{ fontWeight: "bold" }}>{leaveMetrics.rejectedLeaves}</span>
                          </MDTypography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                            <span>Pending Leaves: </span>
                            <span style={{ fontWeight: "bold" }}>
                              {leaveMetrics.totalLeaves - leaveMetrics.approvedLeaves - leaveMetrics.rejectedLeaves}
                            </span>
                          </MDTypography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Leave Application Status */}
                  <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"} sx={{ mb: 2 }}>
                    Leave Application Status (2025)
                  </MDTypography>
                  {leaves.length === 0 ? (
                    <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                      No leave applications available.
                    </MDTypography>
                  ) : (
                    <Grid container spacing={3}>
                      {leaves.map((leave) => (
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
                                    <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                                      <span>Employee ID: </span>
                                      <span style={{ fontWeight: "bold" }}>{leave.employeeId}</span>
                                    </MDTypography>
                                    <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                                      <span>Name: </span>
                                      <span style={{ fontWeight: "bold" }}>{leave.name}</span>
                                    </MDTypography>
                                    <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                                      <span>Leave Type: </span>
                                      <span style={{ fontWeight: "bold" }}>{leave.leaveType}</span>
                                    </MDTypography>
                                    <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                                      <span>Start Date: </span>
                                      <span style={{ fontWeight: "bold" }}>{formatDate(leave.startDate)}</span>
                                    </MDTypography>
                                  </Grid>
                                  <Grid item xs={12} sm={6}>
                                    <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                                      <span>End Date: </span>
                                      <span style={{ fontWeight: "bold" }}>{formatDate(leave.endDate)}</span>
                                    </MDTypography>
                                    <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                                      <span>Days: </span>
                                      <span style={{ fontWeight: "bold" }}>
                                        {leave.numberOfDays} {leave.halfDay ? "(Half Day)" : ""}
                                      </span>
                                    </MDTypography>
                                    <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                                      <span>Reason: </span>
                                      <span style={{ fontWeight: "bold" }}>{leave.reason}</span>
                                    </MDTypography>
                                    <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                                      <span>Applied Date: </span>
                                      <span style={{ fontWeight: "bold" }}>{formatDate(leave.appliedDate)}</span>
                                    </MDTypography>
                                  </Grid>
                                </Grid>
                              </CardContent>
                            </Box>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </MDBox>
              </Card>
            </Grid>
          </Grid>
        </motion.div>
      </MDBox>
      <Box
        sx={{
          marginLeft: { xs: "0", md: miniSidenav ? "80px" : "250px" },
          backgroundColor: darkMode ? "#212121" : "#f3f3f3",
        }}
      >
        <Footer />
      </Box>

      {/* Edit Profile Modal */}
      {editOpen && (
        <Box sx={{ ...formContainerStyle, display: "block" }}>
          <form onSubmit={handleFormSubmit}>
            <Typography sx={formHeadingStyle}>Edit Profile</Typography>
            <label style={formLabelStyle}>Designation</label>
            <input
              type="text"
              name="designation"
              value={formData.designation}
              onChange={handleFormChange}
              placeholder="Enter designation"
              style={{
                ...formInputStyle,
                borderColor: formErrors.designation ? "#d32f2f" : "#ddd",
              }}
              required
            />
            {formErrors.designation && (
              <span
                style={{
                  color: "#d32f2f",
                  fontSize: "12px",
                  display: "block",
                  marginBottom: "10px",
                }}
              >
                {formErrors.designation}
              </span>
            )}
            <label style={formLabelStyle}>Department</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleFormChange}
              placeholder="Enter department"
              style={{
                ...formInputStyle,
                borderColor: formErrors.department ? "#d32f2f" : "#ddd",
              }}
              required
            />
            {formErrors.department && (
              <span
                style={{
                  color: "#d32f2f",
                  fontSize: "12px",
                  display: "block",
                  marginBottom: "10px",
                }}
              >
                {formErrors.department}
              </span>
            )}
            <label style={formLabelStyle}>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleFormChange}
              style={{
                ...formSelectStyle,
                borderColor: formErrors.status ? "#d32f2f" : "#ddd",
              }}
              required
            >
              <option value="" disabled>
                Select status
              </option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
            </select>
            {formErrors.status && (
              <span
                style={{
                  color: "#d32f2f",
                  fontSize: "12px",
                  display: "block",
                  marginBottom: "10px",
                }}
              >
                {formErrors.status}
              </span>
            )}
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <button
                style={formButtonStyle}
                type="button"
                onClick={handleEditClose}
              >
                Cancel
              </button>
              <button
                style={{ ...formButtonStyle, backgroundColor: "#1976d2" }}
                type="submit"
              >
                Save
              </button>
            </Box>
          </form>
        </Box>
      )}

      {/* Leave Application Modal */}
      {leaveOpen && (
        <Box sx={{ ...formContainerStyle, display: "block" }}>
          <form onSubmit={handleSubmitLeaveApplication}>
            <Typography sx={formHeadingStyle}>Apply for Leave</Typography>
            <label style={formLabelStyle}>Employee ID</label>
            <input
              type="text"
              name="employeeId"
              value={leaveFormData.employeeId}
              style={{ ...formInputStyle }}
              disabled
            />
            <label style={formLabelStyle}>Name</label>
            <input
              type="text"
              name="name"
              value={leaveFormData.name}
              style={{ ...formInputStyle }}
              disabled
            />
            <label style={formLabelStyle}>Email</label>
            <input
              type="email"
              name="email"
              value={leaveFormData.email}
              style={{ ...formInputStyle }}
              disabled
            />
            <label style={formLabelStyle}>Leave Type</label>
            <select
              name="leaveType"
              value={leaveFormData.leaveType}
              onChange={handleLeaveFormChange}
              style={{
                ...formSelectStyle,
                borderColor: formErrors.leaveType ? "#d32f2f" : "#ddd",
              }}
              required
            >
              <option value="" disabled>Select Leave Type</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Vacation">Vacation</option>
              <option value="Personal Leave">Personal Leave</option>
              <option value="Maternity/Paternity Leave">Maternity/Paternity Leave</option>
              <option value="Bereavement Leave">Bereavement Leave</option>
            </select>
            {formErrors.leaveType && (
              <span
                style={{
                  color: "#d32f2f",
                  fontSize: "12px",
                  display: "block",
                  marginBottom: "10px",
                }}
              >
                {formErrors.leaveType}
              </span>
            )}
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <label style={formLabelStyle}>Start Date</label>
              <DatePicker
                value={leaveFormData.startDate}
                onChange={(date) => handleDateChange("startDate", date)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    sx={{
                      "& .MuiInputBase-root": {
                        ...formInputStyle,
                        borderColor: formErrors.startDate ? "#d32f2f" : "#ddd",
                      },
                      width: "100%",
                    }}
                    required
                  />
                )}
              />
              {formErrors.startDate && (
                <span
                  style={{
                    color: "#d32f2f",
                    fontSize: "12px",
                    display: "block",
                    marginBottom: "10px",
                  }}
                >
                  {formErrors.startDate}
                </span>
              )}
              <label style={formLabelStyle}>End Date</label>
              <DatePicker
                value={leaveFormData.endDate}
                onChange={(date) => handleDateChange("endDate", date)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    sx={{
                      "& .MuiInputBase-root": {
                        ...formInputStyle,
                        borderColor: formErrors.endDate ? "#d32f2f" : "#ddd",
                      },
                      width: "100%",
                    }}
                    required
                  />
                )}
              />
              {formErrors.endDate && (
                <span
                  style={{
                    color: "#d32f2f",
                    fontSize: "12px",
                    display: "block",
                    marginBottom: "10px",
                  }}
                >
                  {formErrors.endDate}
                </span>
              )}
            </LocalizationProvider>
            <label style={formLabelStyle}>Number of Days</label>
            <input
              type="number"
              name="numberOfDays"
              value={leaveFormData.numberOfDays}
              style={{ ...formInputStyle }}
              disabled
            />
            <label style={formLabelStyle}>Half Day</label>
            <input
              type="checkbox"
              name="halfDay"
              checked={leaveFormData.halfDay}
              onChange={(event) =>
                setLeaveFormData((prevData) => ({
                  ...prevData,
                  halfDay: event.target.checked,
                }))
              }
              style={{ ...formCheckboxStyle }}
            />
            <label style={formLabelStyle}>Reason</label>
            <textarea
  name="reason"
  value={leaveFormData.reason}
  onChange={handleLeaveFormChange}
  placeholder="Enter reason"
  style={{
    ...formInputStyle,
    minHeight: "80px",
    borderColor: formErrors.reason ? "#d32f2f" : "#ddd"
  }}
  required
/>

            {formErrors.reason && (
              <span
                style={{
                  color: "#d32f2f",
                  fontSize: "12px",
                  display: "block",
                  marginBottom: "10px",
                }}
              >
                {formErrors.reason}
              </span>
            )}
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <button
                style={formButtonStyle}
                type="button"
                onClick={handleLeaveClose}
              >
                Cancel
              </button>
              <button
                style={{ ...formButtonStyle, backgroundColor: "#1976d2" }}
                type="submit"
              >
                Submit
              </button>
            </Box>
          </form>
        </Box>
      )}
    </Box>
  );
}

export default ProfilePage;
