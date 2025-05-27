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
*/

// @mui material components
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Fab from "@mui/material/Fab";
import EditIcon from "@mui/icons-material/Edit";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDAvatar from "components/MDAvatar";

// Material Dashboard 2 React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Firebase imports
import { db, auth } from "../manage-employee/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  updateDoc,
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

const dialogVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2, ease: "easeIn" },
  },
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
  const [formData, setFormData] = useState({
    designation: "",
    department: "",
    status: "",
  });
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Function to filter and clean roles
  const filterRoles = (roles) => {
    const roleSet = new Set();
    roles.forEach((role) => {
      let cleanedRole = role.replace(/:read|:full access/gi, "").trim();
      roleSet.add(cleanedRole);
    });
    return Array.from(roleSet);
  };

  // Fetch and listen to user data from Firestore using email
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (user) => {
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
                    ? data.roles.split(", ")
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
      },
      (error) => {
        console.error("Auth state error:", error);
        setError("Authentication error: " + error.message);
        setLoading(false);
      }
    );

    return () => unsubscribeAuth();
  }, []);

  // Handle edit dialog open
  const handleEditOpen = useCallback(() => {
    setEditOpen(true);
  }, []);

  // Handle edit dialog close
  const handleEditClose = useCallback(() => {
    setEditOpen(false);
    setFormData({
      designation: userData.designation || "",
      department: userData.department || "",
      status: userData.status || "",
    });
  }, [userData]);

  // Handle form input changes
  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Handle form submission
  const handleFormSubmit = useCallback(async () => {
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
        } else {
          setError("No employee document found for this email.");
        }
      } catch (err) {
        console.error("Error updating Firestore data:", err);
        setError("Failed to update profile: " + err.message);
      }
    } else {
      setError("No user logged in");
    }
  }, [formData]);

  // Send password reset email
  const handleSendOtp = useCallback(async () => {
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
              `linear-gradient(135deg, ${gradients.info.main}, ${gradients.info.state})`,
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

        <MDBox mx={{ xs: 2, md: 4 }} mt={-4}>
          <Grid container spacing={-3} direction="column">
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
                    ml: { md: "0%" }, // Adjust this value to shift Card 1 left (negative) or right (positive)
                    // Example: ml: { md: "-20%" } shifts further left, ml: { md: "10%" } shifts right
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
                      zIndex: 2,
                    }}
                  >
                    <MDTypography variant="h6" fontWeight="medium" mb={2}>
                      General Information
                    </MDTypography>
                    <MDBox>
                      <MDBox
                        display="flex"
                        justifyContent="space-between"
                        mb={1}
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
                        mb={1}
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
                        mb={1}
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
                        mb={1}
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
                        mb={1}
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
                      zIndex: 2,
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
                              background: "00CAFF",
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
                            onClick={handleSendOtp}
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
          </Grid>
        </MDBox>
      </motion.div>

      {/* Edit Profile Dialog */}
      <Dialog
        open={editOpen}
        onClose={handleEditClose}
        PaperProps={{
          sx: {
            borderRadius: "12px",
            p: 3,
            minWidth: { xs: "90%", sm: "400px" },
            boxShadow: ({ boxShadows: { lg } }) => lg,
          },
        }}
      >
        <motion.div
          variants={dialogVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <DialogTitle sx={{ fontWeight: "bold", fontSize: "1.25rem" }}>
            Edit Profile
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              name="designation"
              label="Designation"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.designation}
              onChange={handleFormChange}
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": { borderRadius: "8px" },
              }}
            />
            <TextField
              margin="dense"
              name="department"
              label="Department"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.department}
              onChange={handleFormChange}
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": { borderRadius: "8px" },
              }}
            />
            <Select
              name="status"
              value={formData.status}
              onChange={handleFormChange}
              fullWidth
              variant="outlined"
              sx={{
                mt: 2,
                height: "44px",
                borderRadius: "8px",
                "& .MuiOutlinedInput-notchedOutline": { borderRadius: "8px" },
              }}
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="On Leave">On Leave</MenuItem>
            </Select>
          </DialogContent>
          <DialogActions sx={{ justifyContent: "space-between" }}>
            <Button
              onClick={handleEditClose}
              sx={{
                color: ({ palette: { text } }) => text.main,
                textTransform: "none",
                fontWeight: "medium",
                borderRadius: "8px",
                px: 3,
                py: 1,
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: ({ palette: { grey } }) => grey[100],
                  transform: "translateY(-1px)",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFormSubmit}
              variant="contained"
              color="primary"
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                px: 4,
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
                "&:focus": {
                  outline: "2px solid",
                  outlineColor: ({ palette: { primary } }) => primary.light,
                },
              }}
            >
              Save
            </Button>
          </DialogActions>
        </motion.div>
      </Dialog>

      <Footer />
    </DashboardLayout>
  );
}

export default ProfilePage;
