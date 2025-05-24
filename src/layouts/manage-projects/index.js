import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  Typography,
  MenuItem,
  Card,
  CardContent,
  Box,
  Alert,
  FormControl,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Icon,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDProgress from "components/MDProgress";
import DataTable from "examples/Tables/DataTable";
import { db, auth } from "../manage-employee/firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useMaterialUIController } from "context";
import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import { debounce } from "lodash";

const statuses = ["Ongoing", "Completed", "On Hold"];

// Custom button styling to match ManageClient
const CustomButton = styled("button")(({ theme }) => ({
  padding: "15px",
  borderRadius: "10px",
  margin: "15px",
  border: "none",
  color: "white",
  cursor: "pointer",
  backgroundColor: "#4caf50",
  width: "40%",
  fontSize: "16px",
  fontWeight: "bold",
  "&:hover": {
    backgroundColor: "#45a049",
  },
}));

const Progress = ({ value, status }) => {
  const getColor = () => {
    switch (status) {
      case "Completed":
        return "success";
      case "On Hold":
        return "warning";
      default:
        return "info";
    }
  };

  return (
    <MDBox display="flex" alignItems="center">
      <MDTypography variant="caption" color="text" fontWeight="medium">
        {value}%
      </MDTypography>
      <MDBox ml={0.5} width="9rem">
        <MDProgress variant="gradient" color={getColor()} value={value} />
      </MDBox>
    </MDBox>
  );
};

Progress.propTypes = {
  value: PropTypes.number.isRequired,
  status: PropTypes.string.isRequired,
};

const ProjectInfo = ({ name, projectId }) => (
  <MDBox display="flex" alignItems="center" lineHeight={1}>
    <MDBox ml={0} lineHeight={1.2}>
      <MDTypography variant="button" fontWeight="medium" display="block">
        {name}
      </MDTypography>
      <MDTypography variant="caption" color="textSecondary" display="block">
        ID: {projectId}
      </MDTypography>
    </MDBox>
  </MDBox>
);

ProjectInfo.propTypes = {
  name: PropTypes.string.isRequired,
  projectId: PropTypes.string.isRequired,
};

const ManageProject = () => {
  const [open, setOpen] = useState(false);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [projectExpenses, setProjectExpenses] = useState(0);
  const [projectRevenue, setProjectRevenue] = useState(0);
  const [userRoles, setUserRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    team: [],
    budget: "",
    roi: "",
    burnRate: "",
    profitMargin: "",
    revenueGenerated: "",
    expectedRevenue: "",
    startDate: "",
    endDate: "",
    status: "",
    description: "",
    completion: "",
    selectedEmployees: [],
  });

  const [formErrors, setFormErrors] = useState({});

  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;

  // Styles to match ManageClient
  const formContainerStyle = {
    backgroundColor: "#fff",
    borderRadius: "15px",
    boxShadow: "0 0 20px rgba(0, 0, 0, 0.2)",
    padding: "10px 20px",
    width: "500px",
    textAlign: "center",
    margin: "auto",
  };

  const formStyle = {
    border: "none",
  };

  const labelStyle = {
    fontSize: "15px",
    display: "block",
    width: "100%",
    marginTop: "8px",
    marginBottom: "5px",
    textAlign: "left",
    color: "#555",
    fontWeight: "bold",
  };

  const inputStyle = {
    display: "block",
    width: "100%",
    padding: "8px",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "3px",
    fontSize: "12px",
  };

  const selectStyle = {
    display: "block",
    width: "100%",
    marginBottom: "15px",
    padding: "10px",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "5px",
    fontSize: "12px",
  };

  const checkboxContainerStyle = {
    display: "block",
    width: "100%",
    maxHeight: "150px",
    overflowY: "auto",
    marginBottom: "15px",
    padding: "10px",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "5px",
    fontSize: "12px",
    backgroundColor: "#fff",
  };

  const titleStyle = {
    fontSize: "x-large",
    textAlign: "center",
    color: "#327c35",
  };

  useEffect(() => {
    const fetchUserRoles = async () => {
      const user = auth.currentUser;
      if (!user) {
        toast.error("No authenticated user");
        setUserRoles([]);
        setLoadingRoles(false);
        return;
      }

      try {
        const q = query(collection(db, "users"), where("email", "==", user.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0].data();
          setUserRoles(userDoc.roles || []);
        } else {
          toast.error("User not found in Firestore");
          setUserRoles([]);
        }
      } catch (error) {
        toast.error("Error fetching user roles");
        console.error("Error fetching user roles:", error);
        setUserRoles([]);
      }
      setLoadingRoles(false);
    };
    fetchUserRoles();
  }, []);

  const isReadOnly =
    userRoles.includes("ManageProject:read") && !userRoles.includes("ManageProject:full access");
  const hasAccess =
    userRoles.includes("ManageProject:read") || userRoles.includes("ManageProject:full access");

  const normalizeDate = (dateField) => {
    if (!dateField) return "";
    if (dateField instanceof Timestamp) {
      return dateField.toDate().toISOString().split("T")[0];
    }
    if (typeof dateField === "string" && dateField.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateField;
    }
    return "";
  };

  useEffect(() => {
    if (loadingRoles || !hasAccess) return;

    const user = auth.currentUser;
    if (!user) {
      toast.error("No authenticated user");
      setLoadingData(false);
      return;
    }

    let projectsQuery = query(collection(db, "projects"));
    if (isReadOnly) {
      projectsQuery = query(projectsQuery, where("createdBy", "==", user.uid));
    }

    const unsubscribeProjects = onSnapshot(
      projectsQuery,
      (snapshot) => {
        const projectsData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            projectId: data.projectId || doc.id,
            name: data.name || "",
            team: Array.isArray(data.team) ? data.team : [],
            teamMembers: Array.isArray(data.teamMembers) ? data.teamMembers : [],
            financialMetrics: {
              budget: Number(data.financialMetrics?.budget) || 0,
              roi: Number(data.financialMetrics?.roi) || 0,
              burnRate: Number(data.financialMetrics?.burnRate) || 0,
              profitMargin: Number(data.financialMetrics?.profitMargin) || 0,
              revenueGenerated: Number(data.financialMetrics?.revenueGenerated) || 0,
              expectedRevenue: Number(data.financialMetrics?.expectedRevenue) || 0,
            },
            startDate: normalizeDate(data.startDate),
            endDate: normalizeDate(data.endDate),
            status: data.status || "",
            description: data.description || "",
            completion: Number(data.completion) || 0,
            createdBy: data.createdBy || "",
          };
        });
        setProjects(projectsData);
        setLoadingData(false);
      },
      (error) => {
        toast.error("Error fetching projects");
        console.error("Error fetching projects:", error);
        setError("Failed to fetch projects");
        setLoadingData(false);
      }
    );

    const unsubscribeEmployees = onSnapshot(
      collection(db, "employees"),
      (snapshot) => {
        setEmployees(snapshot.docs.map((doc) => ({ id: doc.id, name: doc.data().name || "Unknown" })));
      },
      (error) => {
        toast.error("Error fetching employees");
        console.error("Error fetching employees:", error);
        setError("Failed to fetch employees");
      }
    );

    return () => {
      unsubscribeProjects();
      unsubscribeEmployees();
    };
  }, [loadingRoles, hasAccess, isReadOnly]);

  useEffect(() => {
    if (!selectedProject || !(selectedProject.projectId || selectedProject.id)) {
      setProjectExpenses(0);
      return;
    }

    const pid = selectedProject.projectId || selectedProject.id;
    const q = query(collection(db, "expenses"), where("projectId", "==", pid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let total = 0;
        snapshot.forEach((doc) => {
          total += Number(doc.data().amount) || 0;
        });
        setProjectExpenses(total);
      },
      (error) => {
        toast.error("Error fetching expenses");
        console.error("Error fetching expenses:", error);
        setError("Failed to fetch expenses");
      }
    );
    return () => unsubscribe();
  }, [selectedProject]);

  useEffect(() => {
    if (!selectedProject || !(selectedProject.projectId || selectedProject.id)) {
      setProjectRevenue(0);
      return;
    }

    const pid = selectedProject.projectId || selectedProject.id;
    const q = query(
      collection(db, "earnings"),
      where("category", "==", "Project Revenue"),
      where("referenceId", "==", pid)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let total = 0;
        snapshot.forEach((doc) => {
          total += Number(doc.data().amount) || 0;
        });
        setProjectRevenue(total);
      },
      (error) => {
        toast.error("Error fetching revenue");
        console.error("Error fetching revenue:", error);
        setError("Failed to fetch revenue");
      }
    );
    return () => unsubscribe();
  }, [selectedProject]);

  useEffect(() => {
    const budgetValue = Number(form.budget) || 0;
    const revenueGenerated = budgetValue - projectExpenses;
    const profitMargin = budgetValue > 0 ? (revenueGenerated / budgetValue) * 100 : 0;
    setForm((prev) => ({
      ...prev,
      revenueGenerated: revenueGenerated.toFixed(2),
      profitMargin: profitMargin.toFixed(2),
    }));
  }, [form.budget, projectExpenses]);

  const handleSearch = useCallback(
    debounce((value) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  const filteredProjects = useMemo(() => {
    if (!searchTerm) return projects;
    const term = searchTerm.toLowerCase();
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(term) ||
        project.projectId.toLowerCase().includes(term) ||
        project.status.toLowerCase().includes(term)
    );
  }, [projects, searchTerm]);

  const handleClickOpen = () => {
    setOpen(true);
    resetForm();
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleViewDetails = async (project) => {
    try {
      const projectRef = doc(db, "projects", project.id);
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        const data = projectSnap.data();
        const teamMemberIds = Array.isArray(data.teamMembers) ? data.teamMembers : [];
        const teamMemberNames = teamMemberIds
          .map((id) => {
            const emp = employees.find((e) => e.id === id);
            return emp ? emp.name : null;
          })
          .filter(Boolean);
        setSelectedProject({
          id: projectSnap.id,
          projectId: data.projectId || projectSnap.id,
          name: data.name || "",
          team: Array.isArray(data.team) ? data.team : [],
          teamMembers: teamMemberNames,
          financialMetrics: {
            budget: Number(data.financialMetrics?.budget) || 0,
            roi: Number(data.financialMetrics?.roi) || 0,
            burnRate: Number(data.financialMetrics?.burnRate) || 0,
            profitMargin: Number(data.financialMetrics?.profitMargin) || 0,
            revenueGenerated: Number(data.financialMetrics?.revenueGenerated) || 0,
            expectedRevenue: Number(data.financialMetrics?.expectedRevenue) || 0,
          },
          startDate: normalizeDate(data.startDate),
          endDate: normalizeDate(data.endDate),
          status: data.status || "",
          description: data.description || "",
          completion: Number(data.completion) || 0,
          createdBy: data.createdBy || "",
        });
      } else {
        setSelectedProject({
          ...project,
          teamMembers: project.teamMembers
            .map((id) => {
              const emp = employees.find((e) => e.id === id);
              return emp ? emp.name : null;
            })
            .filter(Boolean),
        });
      }
      setViewDetailsOpen(true);
    } catch (error) {
      toast.error("Error fetching project details");
      console.error("Error fetching project details:", error);
      setError("Failed to fetch project details");
    }
  };

  const handleEditFromDetails = () => {
    const project = selectedProject;
    setEditingProject(project);
    setForm({
      name: project.name,
      team: project.team || [],
      budget: project.financialMetrics?.budget || "",
      roi: project.financialMetrics?.roi || "",
      burnRate: project.financialMetrics?.burnRate || "",
      profitMargin: project.financialMetrics?.profitMargin || "",
      revenueGenerated: project.financialMetrics?.revenueGenerated || "",
      expectedRevenue: project.financialMetrics?.expectedRevenue || "",
      startDate: project.startDate || "",
      endDate: project.endDate || "",
      status: project.status || "",
      description: project.description || "",
      completion: project.completion || "",
      selectedEmployees: employees.filter((e) => project.teamMembers.includes(e.name)),
    });
    setViewDetailsOpen(false);
    setOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!form.name) errors.name = "Project name is required";
    if (!form.status) errors.status = "Status is required";
    if (!form.startDate) errors.startDate = "Start date is required";
    if (form.budget && Number(form.budget) < 0) errors.budget = "Budget must be non-negative";
    if (form.roi && Number(form.roi) < 0) errors.roi = "ROI must be non-negative";
    if (form.burnRate && Number(form.burnRate) < 0) errors.burnRate = "Burn rate must be non-negative";
    if (form.completion && (Number(form.completion) < 0 || Number(form.completion) > 100))
      errors.completion = "Completion must be between 0 and 100";
    if (form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      errors.endDate = "End date must be after start date";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      toast.error("Please fix form errors");
      return;
    }
    setConfirmUpdateOpen(true);
  };

  const confirmUpdate = async () => {
    setSaving(true);
    const user = auth.currentUser;
    if (!user) {
      toast.error("No authenticated user");
      setSaving(false);
      setConfirmUpdateOpen(false);
      return;
    }

    try {
      const projectData = {
        projectId: editingProject ? editingProject.projectId : doc(collection(db, "projects")).id,
        name: form.name,
        team: form.team,
        teamMembers: form.selectedEmployees.map((e) => e.id),
        financialMetrics: {
          budget: Number(form.budget) || 0,
          roi: Number(form.roi) || 0,
          burnRate: Number(form.burnRate) || 0,
          profitMargin: Number(form.profitMargin) || 0,
          revenueGenerated: Number(form.revenueGenerated) || 0,
          expectedRevenue: Number(form.expectedRevenue) || 0,
        },
        startDate: form.startDate ? Timestamp.fromDate(new Date(form.startDate)) : null,
        endDate: form.endDate ? Timestamp.fromDate(new Date(form.endDate)) : null,
        status: form.status,
        description: form.description,
        completion: Number(form.completion) || 0,
        createdBy: user.uid,
      };

      if (editingProject) {
        await updateDoc(doc(db, "projects", editingProject.id), projectData);
        toast.success("Project updated successfully");
      } else {
        await addDoc(collection(db, "projects"), projectData);
        toast.success("Project added successfully");
      }
      setConfirmUpdateOpen(false);
      handleClose();
    } catch (error) {
      toast.error("Error saving project");
      console.error("Error saving project:", error);
      setError("Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "projects", deleteId));
      toast.success("Project deleted successfully");
      setConfirmDeleteOpen(false);
      setViewDetailsOpen(false);
    } catch (error) {
      toast.error("Error deleting project");
      console.error("Error deleting project:", error);
      setError("Failed to delete project");
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      team: [],
      budget: "",
      roi: "",
      burnRate: "",
      profitMargin: "",
      revenueGenerated: "",
      expectedRevenue: "",
      startDate: "",
      endDate: "",
      status: "",
      description: "",
      completion: "",
      selectedEmployees: [],
    });
    setEditingProject(null);
    setFormErrors({});
  };

  const tableData = useMemo(
    () => ({
      columns: [
        { Header: "project", accessor: "project", width: "30%", align: "left" },
        { Header: "budget", accessor: "budget", align: "left" },
        { Header: "status", accessor: "status", align: "center" },
        { Header: "completion", accessor: "completion", align: "center" },
        { Header: "action", accessor: "action", align: "center" },
      ],
      rows: filteredProjects.map((project) => ({
        project: <ProjectInfo name={project.name} projectId={project.projectId} />,
        budget: (
          <MDTypography variant="button" color="text" fontWeight="medium">
            ${project.financialMetrics?.budget || 0}
          </MDTypography>
        ),
        status: (
          <Chip
            label={project.status}
            color={
              project.status === "Completed"
                ? "success"
                : project.status === "On Hold"
                ? "warning"
                : "info"
            }
            size="small"
          />
        ),
        completion: <Progress value={project.completion || 0} status={project.status} />,
        action: (
          <MDBox display="flex" justifyContent="center">
            <Button
              variant="gradient"
              color={darkMode ? "dark" : "info"}
              onClick={() => handleViewDetails(project)}
              sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
            >
              <Icon>visibility</Icon> View Project
            </Button>
          </MDBox>
        ),
      })),
    }),
    [filteredProjects, darkMode]
  );

  if (loadingRoles) {
    return (
      <Box
        sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}
      >
        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>
          Loading...
        </MDTypography>
      </Box>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/unauthorized" />;
  }

  return (
    <Box
      sx={{
        backgroundColor: darkMode ? "background.default" : "background.paper",
        minHeight: "100vh",
      }}
    >
      <DashboardNavbar
        absolute
        light={!darkMode}
        isMini={false}
        sx={{
          backgroundColor: darkMode ? "rgba(33, 33, 33, 0.9)" : "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          zIndex: 1100,
          padding: "0 16px",
          minHeight: "60px",
          top: "8px",
          left: { xs: "0", md: miniSidenav ? "80px" : "260px" },
          width: { xs: "100%", md: miniSidenav ? "calc(100% - 80px)" : "calc(100% - 260px)" },
        }}
      />
      <MDBox
        p={3}
        sx={{
          marginLeft: { xs: "0", md: miniSidenav ? "80px" : "260px" },
          marginTop: { xs: "140px", md: "100px" },
          backgroundColor: darkMode ? "background.default" : "background.paper",
          minHeight: "calc(100vh - 80px)",
          paddingTop: { xs: "32px", md: "24px" },
          zIndex: 1000,
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
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <MDTypography variant="h6" color={darkMode ? "white" : "white"}>
                  Projects
                </MDTypography>
                <TextField
                  label="Search by Name, ID, or Status"
                  variant="outlined"
                  size="small"
                  onChange={(e) => handleSearch(e.target.value)}
                  sx={{
                    maxWidth: 300,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "8px",
                      backgroundColor: darkMode ? "#424242" : "#fff",
                      color: darkMode ? "white" : "black",
                    },
                    "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                  }}
                />
              </MDBox>
              <MDBox pt={3} pb={2} px={2}>
                {error && (
                  <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                {!isReadOnly && (
                  <Button
                    variant="gradient"
                    color={darkMode ? "dark" : "info"}
                    onClick={handleClickOpen}
                    sx={{ mb: 2, textTransform: "none", fontWeight: "medium", boxShadow: 3 }}
                  >
                    Add Project
                  </Button>
                )}
                {loadingData ? (
                  <Typography>Loading projects...</Typography>
                ) : filteredProjects.length === 0 ? (
                  <Typography>No projects available</Typography>
                ) : (
                  <DataTable
                    table={tableData}
                    isSorted={false}
                    entriesPerPage={false}
                    showTotalEntries={false}
                    noEndBorder
                  />
                )}
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Box
        sx={{
          marginLeft: { xs: "0", md: miniSidenav ? "80px" : "260px" },
          backgroundColor: darkMode ? "background.default" : "background.paper",
          zIndex: 1100,
        }}
      >
        <Footer />
      </Box>

      <Dialog
        open={viewDetailsOpen}
        onClose={() => setViewDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: darkMode ? "background.default" : "background.paper",
            borderRadius: "15px",
            boxShadow: "0 0 20px rgba(0, 0, 0, 0.2)",
          },
        }}
      >
        <DialogTitle sx={{ ...titleStyle }}>Project Details</DialogTitle>
        <DialogContent>
          {selectedProject && (
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
              }}
            >
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <MDTypography
                      variant="h4"
                      sx={{ fontWeight: "bold", color: darkMode ? "white" : "#333", mb: 2 }}
                    >
                      {selectedProject.projectId || selectedProject.id || "N/A"}
                    </MDTypography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MDTypography
                      variant="body2"
                      color={darkMode ? "white" : "textSecondary"}
                    >
                      <span style={{ fontWeight: "bold" }}>Name: </span>
                      {selectedProject.name || "N/A"}
                    </MDTypography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MDTypography
                      variant="body2"
                      color={darkMode ? "white" : "textSecondary"}
                    >
                      <span style={{ fontWeight: "bold" }}>Team: </span>
                      {selectedProject.team.join(", ") || "N/A"}
                    </MDTypography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MDTypography
                      variant="body2"
                      color={darkMode ? "white" : "textSecondary"}
                    >
                      <span style={{ fontWeight: "bold" }}>Team Members: </span>
                      {selectedProject.teamMembers.join(", ") || "N/A"}
                    </MDTypography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MDTypography
                      variant="body2"
                      color={darkMode ? "white" : "textSecondary"}
                    >
                      <span style={{ fontWeight: "bold" }}>Budget: </span>
                      ${selectedProject.financialMetrics?.budget || 0}
                    </MDTypography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MDTypography
                      variant="body2"
                      color={darkMode ? "white" : "textSecondary"}
                    >
                      <span style={{ fontWeight: "bold" }}>Expenses: </span>
                      ${projectExpenses}
                    </MDTypography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MDTypography
                      variant="body2"
                      color={darkMode ? "white" : "textSecondary"}
                    >
                      <span style={{ fontWeight: "bold" }}>ROI (%): </span>
                      {selectedProject.financialMetrics?.roi || 0}
                    </MDTypography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MDTypography
                      variant="body2"
                      color={darkMode ? "white" : "textSecondary"}
                    >
                      <span style={{ fontWeight: "bold" }}>Burn Rate: </span>
                      {selectedProject.financialMetrics?.burnRate || 0}
                    </MDTypography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MDTypography
                      variant="body2"
                      color={darkMode ? "white" : "textSecondary"}
                    >
                      <span style={{ fontWeight: "bold" }}>Profit Margin (%): </span>
                      {selectedProject.financialMetrics?.profitMargin || 0}
                    </MDTypography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MDTypography
                      variant="body2"
                      color={darkMode ? "white" : "textSecondary"}
                    >
                      <span style={{ fontWeight: "bold" }}>Revenue Generated: </span>
                      ${projectRevenue}
                    </MDTypography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MDTypography
                      variant="body2"
                      color={darkMode ? "white" : "textSecondary"}
                    >
                      <span style={{ fontWeight: "bold" }}>Expected Revenue: </span>
                      ${selectedProject.financialMetrics?.expectedRevenue || 0}
                    </MDTypography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MDTypography
                      variant="body2"
                      color={darkMode ? "white" : "textSecondary"}
                    >
                      <span style={{ fontWeight: "bold" }}>Start Date: </span>
                      {selectedProject.startDate
                        ? new Date(selectedProject.startDate).toLocaleDateString()
                        : "N/A"}
                    </MDTypography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MDTypography
                      variant="body2"
                      color={darkMode ? "white" : "textSecondary"}
                    >
                      <span style={{ fontWeight: "bold" }}>End Date: </span>
                      {selectedProject.endDate
                        ? new Date(selectedProject.endDate).toLocaleDateString()
                        : "Ongoing"}
                    </MDTypography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MDTypography
                      variant="body2"
                      color={darkMode ? "white" : "textSecondary"}
                    >
                      <span style={{ fontWeight: "bold" }}>Status: </span>
                      <Chip
                        label={selectedProject.status || "N/A"}
                        sx={{
                          backgroundColor:
                            selectedProject.status === "Completed"
                              ? "#4CAF50"
                              : selectedProject.status === "On Hold"
                              ? "#FF9800"
                              : "#2196F3",
                          color: "#fff",
                          fontSize: "12px",
                          padding: "4px 8px",
                          borderRadius: "6px",
                        }}
                      />
                    </MDTypography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MDTypography
                      variant="body2"
                      color={darkMode ? "white" : "textSecondary"}
                    >
                      <span style={{ fontWeight: "bold" }}>Completion (%): </span>
                      {selectedProject.completion || 0}%
                    </MDTypography>
                  </Grid>
                  <Grid item xs={12}>
                    <MDTypography
                      variant="body2"
                      color={darkMode ? "white" : "textSecondary"}
                    >
                      <span style={{ fontWeight: "bold" }}>Description: </span>
                      {selectedProject.description || "No description available"}
                    </MDTypography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </DialogContent>
        <DialogActions sx={{ padding: "16px 24px", justifyContent: "center" }}>
          <CustomButton onClick={() => setViewDetailsOpen(false)}>Close</CustomButton>
          {!isReadOnly && (
            <>
              <CustomButton onClick={handleEditFromDetails}>Edit</CustomButton>
              <CustomButton
                onClick={() => {
                  setDeleteId(selectedProject.id);
                  setConfirmDeleteOpen(true);
                }}
                style={{ backgroundColor: "#F44336" }}
              >
                Delete
              </CustomButton>
            </>
          )}
        </DialogActions>
      </Dialog>

      {!isReadOnly && (
        <>
          <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            sx={{
              "& .MuiDialog-paper": {
                backgroundColor: "#f3f3f3",
                borderRadius: "15px",
                boxShadow: "0 0 20px rgba(0, 0, 0, 0.2)",
                width: "500px",
                margin: "auto",
              },
            }}
          >
            <DialogTitle sx={{ ...titleStyle }}>
              {editingProject ? "Edit Project" : "Add Project"}
            </DialogTitle>
            <DialogContent sx={{ py: 2, padding: "10px 20px" }}>
              <fieldset style={formStyle}>
                <form action="#" method="get">
                  <label style={labelStyle} htmlFor="name">
                    Project Name*
                  </label>
                  <input
                    style={{ ...inputStyle, borderColor: formErrors.name ? "red" : "#ddd" }}
                    type="text"
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter Project Name"
                    required
                  />
                  {formErrors.name && (
                    <span style={{ color: "red", fontSize: "12px" }}>{formErrors.name}</span>
                  )}

                  <label style={labelStyle}>Team Members</label>
                  <Box sx={checkboxContainerStyle}>
                    {employees.map((employee) => (
                      <FormControlLabel
                        key={employee.id}
                        control={
                          <Checkbox
                            checked={form.selectedEmployees.some((e) => e.id === employee.id)}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...form.selectedEmployees, employee]
                                : form.selectedEmployees.filter((e) => e.id !== employee.id);
                              setForm({ ...form, selectedEmployees: updated });
                            }}
                            sx={{
                              "& .MuiSvgIcon-root": { fontSize: "20px" },
                            }}
                          />
                        }
                        label={employee.name}
                        sx={{
                          display: "block",
                          margin: "0",
                          "& .MuiFormControlLabel-label": {
                            fontSize: "12px",
                            color: "#555",
                          },
                        }}
                      />
                    ))}
                  </Box>
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{ display: "block", mt: 1 }}
                  >
                    Click to select or deselect team members
                  </Typography>

                  <label style={labelStyle} htmlFor="budget">
                    Budget ($)
                  </label>
                  <input
                    style={{ ...inputStyle, borderColor: formErrors.budget ? "red" : "#ddd" }}
                    type="number"
                    id="budget"
                    value={form.budget}
                    onChange={(e) =>
                      setForm({ ...form, budget: e.target.value })
                    }
                    placeholder="Enter Budget"
                  />
                  {formErrors.budget && (
                    <span style={{ color: "red", fontSize: "12px" }}>{formErrors.budget}</span>
                  )}

                  <label style={labelStyle} htmlFor="roi">
                    ROI (%)
                  </label>
                  <input
                    style={{ ...inputStyle, borderColor: formErrors.roi ? "red" : "#ddd" }}
                    type="number"
                    id="roi"
                    value={form.roi}
                    onChange={(e) =>
                      setForm({ ...form, roi: e.target.value })
                    }
                    placeholder="Enter ROI"
                  />
                  {formErrors.roi && (
                    <span style={{ color: "red", fontSize: "12px" }}>{formErrors.roi}</span>
                  )}

                  <label style={labelStyle} htmlFor="burnRate">
                    Burn Rate
                  </label>
                  <input
                    style={{ ...inputStyle, borderColor: formErrors.burnRate ? "red" : "#ddd" }}
                    type="number"
                    id="burnRate"
                    value={form.burnRate}
                    onChange={(e) =>
                      setForm({ ...form, burnRate: e.target.value })
                    }
                    placeholder="Enter Burn Rate"
                  />
                  {formErrors.burnRate && (
                    <span style={{ color: "red", fontSize: "12px" }}>{formErrors.burnRate}</span>
                  )}

                  <label style={labelStyle} htmlFor="startDate">
                    Start Date*
                  </label>
                  <input
                    style={{ ...inputStyle, borderColor: formErrors.startDate ? "red" : "#ddd" }}
                    type="date"
                    id="startDate"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                  />
                  {formErrors.startDate && (
                    <span style={{ color: "red", fontSize: "12px" }}>{formErrors.startDate}</span>
                  )}

                  <label style={labelStyle} htmlFor="endDate">
                    End Date
                  </label>
                  <input
                    style={{ ...inputStyle, borderColor: formErrors.endDate ? "red" : "#ddd" }}
                    type="date"
                    id="endDate"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                  {formErrors.endDate && (
                    <span style={{ color: "red", fontSize: "12px" }}>{formErrors.endDate}</span>
                  )}

                  <label style={labelStyle} htmlFor="status">
                    Status*
                  </label>
                  <select
                    style={{ ...selectStyle, borderColor: formErrors.status ? "red" : "#ddd" }}
                    id="status"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    required
                  >
                    <option value="" disabled>
                      Select Status
                    </option>
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  {formErrors.status && (
                    <span style={{ color: "red", fontSize: "12px" }}>{formErrors.status}</span>
                  )}

                  <label style={labelStyle} htmlFor="completion">
                    Completion (%)
                  </label>
                  <input
                    style={{ ...inputStyle, borderColor: formErrors.completion ? "red" : "#ddd" }}
                    type="number"
                    id="completion"
                    value={form.completion}
                    onChange={(e) =>
                      setForm({ ...form, completion: e.target.value })
                    }
                    placeholder="Enter Completion Percentage"
                  />
                  {formErrors.completion && (
                    <span style={{ color: "red", fontSize: "12px" }}>{formErrors.completion}</span>
                  )}

                  <label style={labelStyle} htmlFor="description">
                    Description
                  </label>
                  <textarea
                    style={{ ...inputStyle, minHeight: "100px" }}
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Enter Description"
                  />
                </form>
              </fieldset>
            </DialogContent>
            <DialogActions sx={{ padding: "16px 24px", justifyContent: "center" }}>
              <CustomButton onClick={handleClose} disabled={saving}>
                Cancel
              </CustomButton>
              <CustomButton onClick={handleSubmit} disabled={saving}>
                Save
              </CustomButton>
            </DialogActions>
          </Dialog>

          <Dialog
            open={confirmDeleteOpen}
            onClose={() => setConfirmDeleteOpen(false)}
            sx={{
              "& .MuiDialog-paper": {
                backgroundColor: darkMode ? "background.default" : "background.paper",
                borderRadius: "12px",
              },
            }}
          >
            <DialogTitle sx={{ ...titleStyle }}>Confirm Deletion</DialogTitle>
            <DialogContent sx={{ color: darkMode ? "white" : "black" }}>
              Are you sure you want to delete this project?
            </DialogContent>
            <DialogActions sx={{ padding: "16px 24px", justifyContent: "center" }}>
              <CustomButton onClick={() => setConfirmDeleteOpen(false)}>Cancel</CustomButton>
              <CustomButton onClick={handleDelete} style={{ backgroundColor: "#F44336" }}>
                Delete
              </CustomButton>
            </DialogActions>
          </Dialog>

          <Dialog
            open={confirmUpdateOpen}
            onClose={() => setConfirmUpdateOpen(false)}
            sx={{
              "& .MuiDialog-paper": {
                backgroundColor: darkMode ? "background.default" : "background.paper",
                borderRadius: "12px",
              },
            }}
          >
            <DialogTitle sx={{ ...titleStyle }}>Confirm Submission</DialogTitle>
            <DialogContent sx={{ color: darkMode ? "white" : "black" }}>
              Are you sure you want to save this project?
            </DialogContent>
            <DialogActions sx={{ padding: "16px 24px", justifyContent: "center" }}>
              <CustomButton onClick={() => setConfirmUpdateOpen(false)} disabled={saving}>
                Cancel
              </CustomButton>
              <CustomButton onClick={confirmUpdate} disabled={saving}>
                Confirm
              </CustomButton>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
};

ManageProject.propTypes = {};

export default ManageProject;