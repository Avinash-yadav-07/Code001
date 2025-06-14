/**
=========================================================
* Modern Profile Page with Firebase Integration
=========================================================
*
* Modified from Material Dashboard 2 React - v2.2.0
* Copyright 2023 Creative Tim (https://www.creative-tim.com)
* Enhanced for modern UI, Firebase role management, and streamlined user details
* Adapted to match student profile layout with Card 1 centered in first row, Card 2 and Card 3 side by side in second row
* Reduced gap between rows, no employee name in Card 3, adjustable Card 1 position
* Form CSS updated to match ManageAccount styling
* Added Leave Application Status section with leave metrics for 2025
*/

// @mui material components
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Fab from "@mui/material/Fab";
import EditIcon from "@mui/icons-material/Edit";
import Tooltip from "@mui/material/Tooltip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDAvatar from "components/MDAvatar";

// Material Dashboard example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

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

// React hooks and Framer Motion
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const chipVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

// Form styles from ManageAccount
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

const formInputStyle = {
  display: "block",
  width: "100%",
  padding: "6px",
  boxSizing: "border-box",
  border: "1px solid #ddd",
  borderRadius: "3px",
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
  display: "inline",
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
  color: "#555",
  fontWeight: "bold",
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

function ProfilePage() {
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
    employeeId: "",
    name: "",
    leaveType: "",
    startDate: null,
    endDate: null,
    numberOfDays: 0,
    reason: "",
    halfDay: false,
    status: "Pending",
    appliedDate: null,
  });
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [leaves, setLeaves] = useState([]); // New state for leave applications
  const [leaveMetrics, setLeaveMetrics] = useState({
    totalLeaves: 0,
    approvedLeaves: 0,
    rejectedLeaves: 0,
  });

  // Function to filter and clean roles
  const filterRoles = (roles) => {
    if (!Array.isArray(roles)) return [];
    const roleSet = new Set();
    roles.forEach((role) => {
      let cleanedRole = role.replace(/:read|:full access/gi, "").trim();
      roleSet.add(cleanedRole);
    });
    return Array.from(roleSet);
  };

  // Fetch employees for dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const q = query(collection(db, "employees"));
        const querySnapshot = await getDocs(q);
        const employeesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEmployees(employeesData);
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch leave applications for the current user
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

    return () => unsubscribe;
  }, [userData.employeeId]);

  // Calculate number of days between dates
  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Handle leave form changes
  const handleLeaveFormChange = (e) => {
    const { name, value } = e.target;
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
    if (!leaveFormData.leaveType) errors.leaveType = "Leave Type is required";
    if (!leaveFormData.startDate) errors.startDate = "Start Date is required";
    if (!leaveFormData.endDate) errors.endDate = "End Date is required";
    if (!leaveFormData.reason.trim()) errors.reason = "Reason is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle submit leave application
  const handleSubmitLeaveApplication = async () => {
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
        employeeId: "",
        name: "",
        leaveType: "",
        startDate: null,
        endDate: null,
        numberOfDays: 0,
        reason: "",
        halfDay: false,
        status: "Pending",
        appliedDate: null,
      });
      setFormErrors({});
    } catch (err) {
      console.error("Error submitting leave application:", err);
      setError("Failed to submit leave application");
    }
  };

  // Fetch and listen to user data from Firestore using email
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
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
                setError(
                  "Profile data not found for this email. Please contact the administrator."
                );
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

  // Handle edit dialog open
  const handleEditOpen = useCallback(() => {
    setEditOpen(true);
  }, []);

  // Handle leave dialog open
  const handleLeaveOpen = useCallback(() => {
    setLeaveFormData((prev) => ({
      ...prev,
      employeeId: userData.employeeId,
      name: userData.name,
    }));
    setLeaveOpen(true);
  }, [userData]);

  // Handle leave dialog close
  const handleLeaveClose = useCallback(() => {
    setLeaveOpen(false);
    setLeaveFormData({
      employeeId: "",
      name: "",
      leaveType: "",
      startDate: null,
      endDate: null,
      numberOfDays: 0,
      reason: "",
      halfDay: false,
      status: "Pending",
      appliedDate: null,
    });
    setFormErrors({});
  }, []);

  // Handle edit dialog close
  const handleEditClose = useCallback(() => {
    setEditOpen(false);
    setFormData({
      designation: userData.designation || "",
      department: userData.department || "",
      status: userData.status || "",
    });
    setFormErrors({});
  }, [userData]);

  // Handle form input changes
  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
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

  // Handle form submission
  const handleFormSubmit = useCallback(async () => {
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
          setError(null);
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
  }, [formData]);

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

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="80vh"
        >
          <MDTypography variant="h6" color="text">
            Loading...
          </MDTypography>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox mb={4} />
      <motion.div initial="hidden" animate="visible" variants={cardVariants}>
        {/* Header Section */}
        <MDBox
          sx={{
            background: ({ palette: { gradients } }) =>
              `linear-gradient(135deg, ${gradients.info?.main || '#0288d1'}, ${gradients.info?.state || '#26c6da'})`,
            borderRadius: "16px",
            minHeight: "10rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            boxShadow: ({ boxShadows: { md } }) => md,
          }}
        >
          <MDTypography
            variant="h3"
            color="white"
            fontWeight="bold"
            sx={{ textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}
          >
            {userData.name || "My Profile"}
          </MDTypography>
        </MDBox>

        <MDBox mx={{ xs: 2, md: "12px" }} mt={-4}>
          <Grid container spacing={2} direction="column">
            {/* Row 1: Card 1 (Centered, Half-Covered) */}
            <Grid item xs={12}>
              <MDBox display="flex" justifyContent="center" mb={-10}>
                <Card
                  sx={{
                    p: 3,
                    boxShadow: ({ boxShadows: { xl } }) => xl,
                    borderRadius: "20px",
                    background: ({ palette: { background } }) =>
                      background.card || "white",
                    position: "relative",
                    zIndex: 1,
                    width: { xs: "100%", md: "50%" },
                    ml: { md: "0%" },
                  }}
                >
                  <MDBox
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                  >
                    <MDAvatar
                      alt="profile-image"
                      size="xl"
                      shadow="md"
                      sx={{
                        border: "3px solid white",
                        bgcolor: "grey.200",
                        mb: 2,
                      }}
                    />
                    <MDTypography variant="h5" fontWeight="medium" mb={1}>
                      {userData.name || "Unknown User"}
                    </MDTypography>
                    <MDTypography variant="body2" color="text" mb={1}>
                      Employee ID: {userData.employeeId || "N/A"}
                    </MDTypography>
                    <MDTypography variant="body2" color="text" mb={1}>
                      Designation: {userData.designation || "N/A"}
                    </MDTypography>
                    <MDTypography variant="body2" color="text">
                      Department: {userData.department || "N/A"}
                    </MDTypography>
                  </MDBox>
                  <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleLeaveOpen}
                      sx={{
                        borderRadius: "8px",
                        textTransform: "none",
                        px: 3,
                        py: 1,
                        fontWeight: "medium",
                        fontSize: "0.875rem",
                        boxShadow: ({ boxShadows: { md } }) => md,
                        transition: "all 0.3s ease",
                        "&:hover": {
                          boxShadow: ({ boxShadows: { lg } }) => lg,
                          transform: "translateY(-2px)",
                          bgcolor: ({ palette: { primary } }) => primary.dark,
                        },
                      }}
                    >
                      Apply for Leave
                    </Button>
                  </Box>
                  <Tooltip title="Edit Profile">
                    <Fab
                      color="primary"
                      size="medium"
                      onClick={handleEditOpen}
                      sx={{
                        position: "absolute",
                        top: 16,
                        right: 16,
                        boxShadow: ({ boxShadows: { md } }) => md,
                        "&:hover": {
                          transform: "scale(1.1)",
                          transition: "transform 0.2s",
                        },
                      }}
                    >
                      <EditIcon />
                    </Fab>
                  </Tooltip>
                </Card>
              </MDBox>
            </Grid>

            {/* Row 2: Card 2 and Card 3 (Side by Side) */}
            <Grid item xs={12}>
              <Grid container spacing={3}>
                {/* Card 2: General Information */}
                <Grid item xs={12} md={6}>
                  <Card
                    sx={{
                      p: 3,
                      boxShadow: ({ boxShadows: { xl } }) => xl,
                      borderRadius: "20px",
                      background: ({ palette: { background } }) =>
                        background.card || "white",
                      zIndex: 1,
                    }}
                  >
                    <MDTypography variant="h6" fontWeight="medium" mb={2}>
                      General Information
                    </MDTypography>
                    <MDBox>
                      <MDBox
                        display="flex"
                        justifyContent="space-between"
                        mb={2}
                      >
                        <MDTypography
                          variant="body2"
                          color="text"
                          fontWeight="medium"
                        >
                          Employee ID:
                        </MDTypography>
                        <MDTypography variant="body2" color="text">
                          {userData.employeeId || "N/A"}
                        </MDTypography>
                      </MDBox>
                      <MDBox
                        display="flex"
                        justifyContent="space-between"
                        mb={2}
                      >
                        <MDTypography
                          variant="body2"
                          color="text"
                          fontWeight="medium"
                        >
                          Email:
                        </MDTypography>
                        <MDTypography variant="body2" color="text">
                          {userData.email || "N/A"}
                        </MDTypography>
                      </MDBox>
                      <MDBox
                        display="flex"
                        justifyContent="space-between"
                        mb={2}
                      >
                        <MDTypography
                          variant="body2"
                          color="text"
                          fontWeight="medium"
                        >
                          Joining Date:
                        </MDTypography>
                        <MDTypography variant="body2" color="text">
                          {userData.joiningDate || "N/A"}
                        </MDTypography>
                      </MDBox>
                      <MDBox
                        display="flex"
                        justifyContent="space-between"
                        mb={2}
                      >
                        <MDTypography
                          variant="body2"
                          color="text"
                          fontWeight="medium"
                        >
                          Designation:
                        </MDTypography>
                        <MDTypography variant="body2" color="text">
                          {userData.designation || "N/A"}
                        </MDTypography>
                      </MDBox>
                      <MDBox
                        display="flex"
                        justifyContent="space-between"
                        mb={2}
                      >
                        <MDTypography
                          variant="body2"
                          color="text"
                          fontWeight="medium"
                        >
                          Department:
                        </MDTypography>
                        <MDTypography variant="body2" color="text">
                          {userData.department || "N/A"}
                        </MDTypography>
                      </MDBox>
                      <MDBox display="flex" justifyContent="space-between">
                        <MDTypography
                          variant="body2"
                          color="text"
                          fontWeight="medium"
                        >
                          Status:
                        </MDTypography>
                        <MDTypography variant="body2" color="text">
                          {userData.status || "N/A"}
                        </MDTypography>
                      </MDBox>
                    </MDBox>
                  </Card>
                </Grid>

                {/* Card 3: Other Information */}
                <Grid item xs={12} md={6}>
                  <Card
                    sx={{
                      p: 3,
                      boxShadow: ({ boxShadows: { xl } }) => xl,
                      borderRadius: "20px",
                      background: ({ palette: { background } }) =>
                        background.card || "white",
                      zIndex: 1,
                    }}
                  >
                    <MDTypography variant="h6" fontWeight="medium" mb={2}>
                      Other Information
                    </MDTypography>
                    <MDBox>
                      <MDTypography
                        variant="body2"
                        color="text"
                        fontWeight="medium"
                        mb={1}
                      >
                        Roles:
                      </MDTypography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
                        {filterRoles(userData.roles).length > 0 ? (
                          filterRoles(userData.roles).map((role, index) => (
                            <motion.div key={index} variants={chipVariants}>
                              <Chip
                                label={role}
                                color="primary"
                                variant="filled"
                                sx={{
                                  m: 0.5,
                                  borderRadius: "10px",
                                  fontSize: "0.8rem",
                                  fontWeight: "medium",
                                  padding: "4px 8px",
                                  transition: "all 0.2s ease",
                                  "&:hover": {
                                    bgcolor: ({ palette: { primary } }) =>
                                      primary.dark,
                                    transform: "scale(1.05)",
                                  },
                                }}
                              />
                            </motion.div>
                          ))
                        ) : (
                          <MDTypography
                            variant="body2"
                            color="text"
                            sx={{ fontWeight: "regular" }}
                          >
                            No roles assigned
                          </MDTypography>
                        )}
                      </Stack>
                      <Box>
                        {!otpSent ? (
                          <Button
                            variant="contained"
                            sx={{
                              padding: "10px 20px",
                              borderRadius: "10px",
                              background: "#00CAFF",
                              color: "#e8e8e8",
                              fontWeight: "medium",
                              fontSize: "0.875rem",
                              boxShadow: "4px 8px 19px -3px rgba(0,0,0,0.27)",
                              transition: "all 250ms",
                              "&:hover": {
                                backgroundColor: "red",
                                boxShadow: "4px 8px 19px -3px rgba(0,0,0,0.27)",
                                transform: "translateY(-2px)",
                              },
                            }}
                            onClick={handleSendPasswordReset}
                          >
                            Reset Password
                          </Button>
                        ) : (
                          <MDTypography
                            variant="body2"
                            color="success"
                            sx={{ mt: 1, fontWeight: "medium" }}
                          >
                            Password reset email sent! Check your inbox.
                          </MDTypography>
                        )}
                      </Box>
                      {error && (
                        <MDTypography
                          variant="body2"
                          color="error"
                          mt={2}
                          sx={{ fontWeight: "medium" }}
                        >
                          {error}
                        </MDTypography>
                      )}
                    </MDBox>
                  </Card>
                </Grid>
              </Grid>
            </Grid>

            {/* Row 3: Leave Application Status */}
            <Grid item xs={12}>
              <Card
                sx={{
                  p: 3,
                  boxShadow: ({ boxShadows: { xl } }) => xl,
                  borderRadius: "20px",
                  background: ({ palette: { background } }) =>
                    background.card || "white",
                  zIndex: 1,
                  mt: 3,
                }}
              >
                <MDTypography variant="h6" fontWeight="medium" mb={2}>
                  Leave Application Status (2025)
                </MDTypography>
                <MDBox mb={2}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <MDTypography variant="body2" color="text" sx={{ mb: 1 }}>
                        <span>Total Leaves Applied: </span>
                        <span style={{ fontWeight: "bold" }}>{leaveMetrics.totalLeaves}</span>
                      </MDTypography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <MDTypography variant="body2" color="text" sx={{ mb: 1 }}>
                        <span>Approved Leaves: </span>
                        <span style={{ fontWeight: "bold" }}>{leaveMetrics.approvedLeaves}</span>
                      </MDTypography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <MDTypography variant="body2" color="text" sx={{ mb: 1 }}>
                        <span>Rejected Leaves: </span>
                        <span style={{ fontWeight: "bold" }}>{leaveMetrics.rejectedLeaves}</span>
                      </MDTypography>
                    </Grid>
                  </Grid>
                </MDBox>
                <TableContainer component={Paper}>
                  <Table sx={{ minWidth: 650 }} aria-label="leave status table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Leave Type</TableCell>
                        <TableCell>Start Date</TableCell>
                        <TableCell>End Date</TableCell>
                        <TableCell>Days</TableCell>
                        <TableCell>Reason</TableCell>
                        <TableCell>Applied Date</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {leaves.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            No leave applications found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        leaves.map((leave) => (
                          <TableRow key={leave.id}>
                            <TableCell>{leave.leaveType}</TableCell>
                            <TableCell>{formatDate(leave.startDate)}</TableCell>
                            <TableCell>{formatDate(leave.endDate)}</TableCell>
                            <TableCell>
                              {leave.numberOfDays} {leave.halfDay ? "(Half Day)" : ""}
                            </TableCell>
                            <TableCell>{leave.reason}</TableCell>
                            <TableCell>{formatDate(leave.appliedDate)}</TableCell>
                            <TableCell>
                              <Chip
                                label={leave.status}
                                color={
                                  leave.status === "Approved"
                                    ? "success"
                                    : leave.status === "Rejected"
                                    ? "error"
                                    : "warning"
                                }
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Grid>
          </Grid>
        </MDBox>
      </motion.div>

      {/* Edit Profile Dialog */}
      <Box sx={{ ...formContainerStyle, display: editOpen ? "block" : "none" }}>
        <form onSubmit={(e) => { e.preventDefault(); handleFormSubmit(); }}>
          <MDTypography sx={formHeadingStyle}>Edit Profile</MDTypography>
          <label style={formLabelStyle}>Designation*</label>
          <input
            type="text"
            name="designation"
            value={formData.designation}
            onChange={handleFormChange}
            placeholder="Enter Designation"
            style={{ ...formInputStyle, borderColor: formErrors.designation ? "red" : "#ddd" }}
            required
          />
          {formErrors.designation && (
            <span style={{ color: "red", fontSize: "12px", display: "block", marginBottom: "10px" }}>
              {formErrors.designation}
            </span>
          )}
          <label style={formLabelStyle}>Department*</label>
          <input
            type="text"
            name="department"
            value={formData.department}
            onChange={handleFormChange}
            placeholder="Enter Department"
            style={{ ...formInputStyle, borderColor: formErrors.department ? "red" : "#ddd" }}
            required
          />
          {formErrors.department && (
            <span style={{ color: "red", fontSize: "12px", display: "block", marginBottom: "10px" }}>
              {formErrors.department}
            </span>
          )}
          <label style={formLabelStyle}>Status*</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleFormChange}
            style={{ ...formSelectStyle, borderColor: formErrors.status ? "red" : "#ddd" }}
            required
          >
            <option value="" disabled>
              Select Status
            </option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
          </select>
          {formErrors.status && (
            <span style={{ color: "red", fontSize: "12px", display: "block", marginBottom: "10px" }}>
              {formErrors.status}
            </span>
          )}
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <button type="button" onClick={handleEditClose} style={formButtonStyle}>
              Cancel
            </button>
            <button
              type="submit"
              style={{ ...formButtonStyle, backgroundColor: "#1976d2" }}
            >
              Save
            </button>
          </Box>
        </form>
      </Box>

      {/* Leave Application Dialog */}
      <Box sx={{ ...formContainerStyle, display: leaveOpen ? "block" : "none" }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmitLeaveApplication(); }}>
          <MDTypography sx={formHeadingStyle}>Apply for Leave</MDTypography>
          <label style={formLabelStyle}>Employee ID</label>
          <select
            name="employeeId"
            value={leaveFormData.employeeId}
            onChange={handleLeaveFormChange}
            style={formSelectStyle}
            disabled
          >
            <option value={userData.employeeId}>{userData.employeeId}</option>
          </select>
          <label style={formLabelStyle}>Name</label>
          <input
            type="text"
            name="name"
            value={leaveFormData.name}
            onChange={handleLeaveFormChange}
            style={formInputStyle}
            disabled
          />
          <label style={formLabelStyle}>Leave Type*</label>
          <select
            name="leaveType"
            value={leaveFormData.leaveType}
            onChange={handleLeaveFormChange}
            style={{ ...formSelectStyle, borderColor: formErrors.leaveType ? "red" : "#ddd" }}
            required
          >
            <option value="" disabled>
              Select
            </option>
            <option value="Sick Leave">Sick Leave</option>
            <option value="Vacation">Vacation</option>
            <option value="Personal Leave">Personal Leave</option>
            <option value="Maternity/Paternity Leave">Maternity/Paternity Leave</option>
            <option value="Bereavement Leave">Bereavement Leave</option>
          </select>
          {formErrors.leaveType && (
            <span style={{ color: "red", fontSize: "12px", display: "block", marginBottom: "10px" }}>
              {formErrors.leaveType}
            </span>
          )}
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <label style={formLabelStyle}>Start Date*</label>
            <DatePicker
              value={leaveFormData.startDate}
              onChange={(date) => handleDateChange("startDate", date)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  sx={{
                    "& .MuiInputBase-input": {
                      ...formInputStyle,
                      borderColor: formErrors.startDate ? "red" : "#ddd",
                    },
                    width: "100%",
                  }}
                  required
                />
              )}
            />
            {formErrors.startDate && (
              <span style={{ color: "red", fontSize: "12px", display: "block", marginBottom: "10px" }}>
                {formErrors.startDate}
              </span>
            )}
            <label style={formLabelStyle}>End Date*</label>
            <DatePicker
              value={leaveFormData.endDate}
              onChange={(date) => handleDateChange("endDate", date)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  sx={{
                    "& .MuiInputBase-input": {
                      ...formInputStyle,
                      borderColor: formErrors.endDate ? "red" : "#ddd",
                    },
                    width: "100%",
                  }}
                  required
                />
              )}
            />
            {formErrors.endDate && (
              <span style={{ color: "red", fontSize: "12px", display: "block", marginBottom: "10px" }}>
                {formErrors.endDate}
              </span>
            )}
          </LocalizationProvider>
          <label style={formLabelStyle}>Number of Days</label>
          <input
            type="number"
            name="numberOfDays"
            value={leaveFormData.numberOfDays}
            style={formInputStyle}
            disabled
          />
          <label style={formLabelStyle}>Half Day</label>
          <input
            type="checkbox"
            name="halfDay"
            checked={leaveFormData.halfDay}
            onChange={(e) =>
              setLeaveFormData((prev) => ({
                ...prev,
                halfDay: e.target.checked,
              }))
            }
            style={formCheckboxStyle}
          />
          <label style={formLabelStyle}>Reason*</label>
          <textarea
            name="reason"
            value={leaveFormData.reason}
            onChange={handleLeaveFormChange}
            placeholder="Reason for leave"
            style={{ ...formInputStyle, minHeight: "60px", borderColor: formErrors.reason ? "red" : "#ddd" }}
            required
          />
          {formErrors.reason && (
            <span style={{ color: "red", fontSize: "12px", display: "block", marginBottom: "10px" }}>
              {formErrors.reason}
            </span>
          )}
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <button type="button" onClick={handleLeaveClose} style={formButtonStyle}>
              Cancel
            </button>
            <button
              type="submit"
              style={{ ...formButtonStyle, backgroundColor: "#1976d2" }}
            >
              Submit
            </button>
          </Box>
        </form>
      </Box>
      <Footer />
    </DashboardLayout>
  );
}

export default ProfilePage;
