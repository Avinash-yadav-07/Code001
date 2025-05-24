import React, { useState, useEffect, useMemo } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  MenuItem,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { db } from "../manage-employee/firebase";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import MDBox from "components/MDBox";
import InputAdornment from "@mui/material/InputAdornment";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import Icon from "@mui/material/Icon";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useMaterialUIController } from "context";
import { toast } from "react-toastify";

const statuses = ["Active", "Archived"];
const experienceLevels = ["Entry-level", "Mid-level", "Senior-level"];
const departments = ["Development", "HR", "Marketing", "Finance", "Operations"];

const generateRoleId = () => {
  const randomNumber = Math.floor(Math.random() * 900) + 100;
  return `Role-${randomNumber}`;
};

const ManageRoles = () => {
  const [open, setOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
  const [roles, setRoles] = useState([]);
  const [editingRole, setEditingRole] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formErrors, setFormErrors] = useState({});

  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [salaryRange, setSalaryRange] = useState({ min: "", max: "" });
  const [isManagerial, setIsManagerial] = useState(false);
  const [status, setStatus] = useState("");

  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "roles"));
        setRoles(
          querySnapshot.docs.map((doc) => ({
            id: doc.id,
            roleId: doc.data().roleId || `Role-${doc.id}`,
            roleName: doc.data().roleName || "",
            description: doc.data().description || "",
            department: doc.data().department || "",
            responsibilities: Array.isArray(doc.data().responsibilities)
              ? doc.data().responsibilities
              : [],
            requiredSkills: Array.isArray(doc.data().requiredSkills)
              ? doc.data().requiredSkills
              : [],
            experienceLevel: doc.data().experienceLevel || "",
            salaryRange: doc.data().salaryRange || { min: 0, max: 0 },
            isManagerial: !!doc.data().isManagerial,
            status: doc.data().status || "Active",
            createdAt: doc.data().createdAt || null,
            updatedAt: doc.data().updatedAt || null,
          }))
        );
      } catch (error) {
        console.error("Error fetching roles:", error);
        toast.error("Failed to load roles");
      }
    };
    fetchRoles();
  }, []);

  const filteredRoles = useMemo(() => {
    if (!searchTerm) return roles;
    const term = searchTerm.toLowerCase().trim();
    return roles.filter((role) => {
      try {
        return (
          (typeof role.roleName === "string" && role.roleName.toLowerCase().includes(term)) ||
          (typeof role.department === "string" && role.department.toLowerCase().includes(term)) ||
          (typeof role.description === "string" && role.description.toLowerCase().includes(term)) ||
          (typeof role.status === "string" && role.status.toLowerCase().includes(term))
        );
      } catch (error) {
        console.error("Error filtering role:", role, error);
        return false;
      }
    });
  }, [roles, searchTerm]);

  const handleClickOpen = () => {
    setOpen(true);
    resetForm();
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setRoleName(role.roleName);
    setDescription(role.description);
    setDepartment(role.department);
    setResponsibilities(role.responsibilities?.join(", ") || "");
    setRequiredSkills(role.requiredSkills?.join(", ") || "");
    setExperienceLevel(role.experienceLevel);
    setSalaryRange(role.salaryRange || { min: "", max: "" });
    setIsManagerial(role.isManagerial);
    setStatus(role.status);
    setOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!roleName.trim()) errors.roleName = "Role Name is required";
    if (!description.trim()) errors.description = "Description is required";
    if (!department) errors.department = "Department is required";
    if (!responsibilities.trim()) errors.responsibilities = "Responsibilities are required";
    if (!requiredSkills.trim()) errors.requiredSkills = "Required Skills are required";
    if (!experienceLevel) errors.experienceLevel = "Experience Level is required";
    if (!salaryRange.min || isNaN(salaryRange.min) || Number(salaryRange.min) < 0)
      errors.salaryMin = "Valid minimum salary is required";
    if (!salaryRange.max || isNaN(salaryRange.max) || Number(salaryRange.max) < 0)
      errors.salaryMax = "Valid maximum salary is required";
    if (Number(salaryRange.min) > Number(salaryRange.max) && salaryRange.min && salaryRange.max)
      errors.salaryRange = "Minimum salary cannot exceed maximum";
    if (!status) errors.status = "Status is required";
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
    try {
      const roleId = editingRole ? editingRole.roleId : generateRoleId();
      const responsibilitiesArray = responsibilities
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const requiredSkillsArray = requiredSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const newRole = {
        roleId,
        roleName: roleName.trim(),
        description: description.trim(),
        department,
        responsibilities: responsibilitiesArray,
        requiredSkills: requiredSkillsArray,
        experienceLevel,
        salaryRange: {
          min: Number(salaryRange.min),
          max: Number(salaryRange.max),
        },
        isManagerial,
        status,
        createdAt: editingRole ? editingRole.createdAt : Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      };

      if (editingRole) {
        await updateDoc(doc(db, "roles", editingRole.id), newRole);
        setRoles(
          roles.map((role) => (role.id === editingRole.id ? { id: role.id, ...newRole } : role))
        );
        toast.success("Role updated successfully");
      } else {
        const docRef = await addDoc(collection(db, "roles"), newRole);
        setRoles([...roles, { id: docRef.id, ...newRole }]);
        toast.success("Role added successfully");
      }

      setConfirmUpdateOpen(false);
      handleClose();
    } catch (error) {
      console.error("Error saving role:", error);
      toast.error("Failed to save role");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "roles", deleteId));
      setRoles(roles.filter((role) => role.id !== deleteId));
      toast.success("Role deleted successfully");
      setConfirmDeleteOpen(false);
    } catch (error) {
      console.error("Error deleting role:", error);
      toast.error("Failed to delete role");
    }
  };

  const resetForm = () => {
    setRoleName("");
    setDescription("");
    setDepartment("");
    setResponsibilities("");
    setRequiredSkills("");
    setExperienceLevel("");
    setSalaryRange({ min: "", max: "" });
    setIsManagerial(false);
    setStatus("");
    setEditingRole(null);
    setFormErrors({});
  };

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
              >
                <MDTypography variant="h6" color={darkMode ? "white" : "white"}>
                  Role Management
                </MDTypography>
              </MDBox>
              <MDBox pt={3} pb={2} px={2} display="flex" alignItems="center" gap={2}>
                <MDButton
                  variant="gradient"
                  color={darkMode ? "dark" : "info"}
                  onClick={handleClickOpen}
                >
                  Add Role
                </MDButton>
                <TextField
                  label="Search by Role Name, Department, Description, or Status"
                  variant="outlined"
                  size="small"
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                {filteredRoles.length === 0 ? (
                  <Box p={3} textAlign="center">
                    <Typography>No roles found</Typography>
                  </Box>
                ) : (
                  <Grid container spacing={3} sx={{ padding: "16px" }}>
                    {filteredRoles.map((role) => (
                      <Grid item xs={12} key={role.id}>
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
                            <Typography
                              variant="h4"
                              sx={{ fontWeight: "bold", color: darkMode ? "white" : "#333", mb: 2 }}
                            >
                              {role.roleId}
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12} md={6}>
                                <MDTypography
                                  variant="body2"
                                  color={darkMode ? "white" : "textSecondary"}
                                >
                                  <span>Role Name: </span>
                                  <span style={{ fontWeight: "bold" }}>{role.roleName}</span>
                                </MDTypography>
                                <MDTypography
                                  variant="body2"
                                  color={darkMode ? "white" : "textSecondary"}
                                >
                                  <span>Description: </span>
                                  <span style={{ fontWeight: "bold" }}>{role.description}</span>
                                </MDTypography>
                                <MDTypography
                                  variant="body2"
                                  color={darkMode ? "white" : "textSecondary"}
                                >
                                  <span>Department: </span>
                                  <span style={{ fontWeight: "bold" }}>{role.department}</span>
                                </MDTypography>
                                <MDTypography
                                  variant="body2"
                                  color={darkMode ? "white" : "textSecondary"}
                                >
                                  <span>Experience Level: </span>
                                  <span style={{ fontWeight: "bold" }}>{role.experienceLevel}</span>
                                </MDTypography>
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <MDTypography
                                  variant="body2"
                                  color={darkMode ? "white" : "textSecondary"}
                                >
                                  <span>Salary Range: </span>
                                  <span style={{ fontWeight: "bold" }}>
                                    ${role.salaryRange.min} - ${role.salaryRange.max}
                                  </span>
                                </MDTypography>
                                <MDTypography
                                  variant="body2"
                                  color={darkMode ? "white" : "textSecondary"}
                                >
                                  <span>Managerial: </span>
                                  <span style={{ fontWeight: "bold" }}>{role.isManagerial ? "Yes" : "No"}</span>
                                </MDTypography>
                                <MDTypography
                                  variant="body2"
                                  color={darkMode ? "white" : "textSecondary"}
                                >
                                  <span>Status: </span>
                                  <Chip
                                    label={role.status}
                                    sx={{
                                      backgroundColor:
                                        role.status === "Active" ? "#2196F3" : "#9E9E9E",
                                      color: "#fff",
                                      fontSize: "12px",
                                      padding: "4px 8px",
                                      borderRadius: "6px",
                                    }}
                                  />
                                </MDTypography>
                              </Grid>
                            </Grid>
                          </CardContent>
                          <CardActions sx={{ display: "flex", justifyContent: "flex-end" }}>
                            <MDButton
                              variant="gradient"
                              color={darkMode ? "dark" : "info"}
                              onClick={() => handleEdit(role)}
                              sx={{ padding: "12px 24px" }}
                            >
                              <Icon fontSize="medium">edit</Icon> Edit
                            </MDButton>
                            <MDButton
                              variant="gradient"
                              color="error"
                              onClick={() => {
                                setDeleteId(role.id);
                                setConfirmDeleteOpen(true);
                              }}
                              sx={{ ml: 1, padding: "12px 24px" }}
                            >
                              <Icon>delete</Icon> Delete
                            </MDButton>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
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
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: darkMode ? "background.default" : "background.paper",
          },
        }}
      >
        <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
          {editingRole ? "Edit Role" : "Add Role"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Role Name"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                fullWidth
                margin="dense"
                required
                error={!!formErrors.roleName}
                helperText={formErrors.roleName}
                sx={{
                  input: { color: darkMode ? "white" : "black" },
                  "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                margin="dense"
                required
                multiline
                rows={3}
                error={!!formErrors.description}
                helperText={formErrors.description}
                sx={{
                  input: { color: darkMode ? "white" : "black" },
                  "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                fullWidth
                margin="dense"
                required
                error={!!formErrors.department}
                helperText={formErrors.department}
                sx={{
                  input: { color: darkMode ? "white" : "black" },
                  "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                }}
              >
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Experience Level"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                fullWidth
                margin="dense"
                required
                error={!!formErrors.experienceLevel}
                helperText={formErrors.experienceLevel}
                sx={{
                  input: { color: darkMode ? "white" : "black" },
                  "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                }}
              >
                {experienceLevels.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Responsibilities"
                value={responsibilities}
                onChange={(e) => setResponsibilities(e.target.value)}
                fullWidth
                margin="dense"
                required
                placeholder="Separate with commas"
                error={!!formErrors.responsibilities}
                helperText={formErrors.responsibilities}
                sx={{
                  input: { color: darkMode ? "white" : "black" },
                  "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Required Skills"
                value={requiredSkills}
                onChange={(e) => setRequiredSkills(e.target.value)}
                fullWidth
                margin="dense"
                required
                placeholder="Separate with commas"
                error={!!formErrors.requiredSkills}
                helperText={formErrors.requiredSkills}
                sx={{
                  input: { color: darkMode ? "white" : "black" },
                  "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                label="Salary Range (Min)"
                value={salaryRange.min}
                onChange={(e) => setSalaryRange({ ...salaryRange, min: e.target.value })}
                fullWidth
                margin="dense"
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                error={!!formErrors.salaryMin || !!formErrors.salaryRange}
                helperText={formErrors.salaryMin || formErrors.salaryRange}
                sx={{
                  input: { color: darkMode ? "white" : "black" },
                  "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                label="Salary Range (Max)"
                value={salaryRange.max}
                onChange={(e) => setSalaryRange({ ...salaryRange, max: e.target.value })}
                fullWidth
                margin="dense"
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                error={!!formErrors.salaryMax || !!formErrors.salaryRange}
                helperText={formErrors.salaryMax || formErrors.salaryRange}
                sx={{
                  input: { color: darkMode ? "white" : "black" },
                  "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isManagerial}
                    onChange={(e) => setIsManagerial(e.target.checked)}
                    color="primary"
                  />
                }
                label="Managerial Role"
                sx={{ color: darkMode ? "white" : "black" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                fullWidth
                margin="dense"
                required
                error={!!formErrors.status}
                helperText={formErrors.status}
                sx={{
                  input: { color: darkMode ? "white" : "black" },
                  "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                }}
              >
                {statuses.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: darkMode ? "background.default" : "background.paper",
          },
        }}
      >
        <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
          Want to delete role data?
        </DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmUpdateOpen}
        onClose={() => setConfirmUpdateOpen(false)}
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: darkMode ? "background.default" : "background.paper",
          },
        }}
      >
        <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
          Want to save details?
        </DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmUpdateOpen(false)}>Cancel</Button>
          <Button onClick={confirmUpdate} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageRoles;