import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import "react-toastify/dist/ReactToastify.css";
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
  Checkbox,
  FormControlLabel,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { db, auth } from "../manage-employee/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import Icon from "@mui/material/Icon";
import { DatePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useMaterialUIController } from "context";
import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import { debounce } from "lodash";

const categories = [
  "Rent",
  "Software Licenses",
  "Utilities",
  "Salaries",
  "Marketing",
  "Other",
  "Project",
];

// Utility function to format dates
const formatDate = (date) => {
  if (!date) return "N/A";
  try {
    const d = date.toDate ? date.toDate() : new Date(date);
    return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString();
  } catch (error) {
    console.error("Error formatting date:", date, error);
    return "N/A";
  }
};

// Expense Card Component
const ExpenseCard = ({ expense, onEdit, onDelete, darkMode, isReadOnly }) => (
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
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <Chip label={expense.category} color="primary" />
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
            <span>Expense ID: </span>
            <span style={{ fontWeight: "bold" }}>{expense.expenseId}</span>
          </MDTypography>
          <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
            <span>Amount: </span>
            <span style={{ fontWeight: "bold" }}>${expense.amount.toFixed(2)}</span>
          </MDTypography>
          <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
            <span>Date: </span>
            <span style={{ fontWeight: "bold" }}>{formatDate(expense.date)}</span>
          </MDTypography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
            <span>Description: </span>
            <span style={{ fontWeight: "bold" }}>{expense.description || "N/A"}</span>
          </MDTypography>
          <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
            <span>Project ID: </span>
            <span style={{ fontWeight: "bold" }}>{expense.projectId || "N/A"}</span>
          </MDTypography>
          <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
            <span>Account ID: </span>
            <span style={{ fontWeight: "bold" }}>{expense.accountId || "N/A"}</span>
          </MDTypography>
          <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
            <span>Recurring: </span>
            <Chip label={expense.recurring ? "Yes" : "No"} size="small" />
          </MDTypography>
        </Grid>
      </Grid>
    </CardContent>
    {!isReadOnly && (
      <CardActions sx={{ display: "flex", justifyContent: "flex-end" }}>
        <MDButton
          variant="gradient"
          color={darkMode ? "dark" : "info"}
          onClick={() => onEdit(expense)}
        >
          <Icon fontSize="medium">edit</Icon> Edit
        </MDButton>
        <MDButton variant="gradient" color="error" onClick={() => onDelete(expense.id)}>
          <Icon fontSize="medium">delete</Icon> Delete
        </MDButton>
      </CardActions>
    )}
  </Card>
);

ExpenseCard.propTypes = {
  expense: PropTypes.shape({
    id: PropTypes.string.isRequired,
    expenseId: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    amount: PropTypes.number.isRequired,
    date: PropTypes.oneOfType([PropTypes.object, PropTypes.string]).isRequired,
    description: PropTypes.string,
    projectId: PropTypes.string,
    accountId: PropTypes.string,
    recurring: PropTypes.bool,
    softwareName: PropTypes.string,
    employeeIds: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  darkMode: PropTypes.bool.isRequired,
  isReadOnly: PropTypes.bool.isRequired,
};

const ManageExpenses = () => {
  const [open, setOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [dateFilterType, setDateFilterType] = useState("all");
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(null);
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [softwareName, setSoftwareName] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [projectIds, setProjectIds] = useState([]);
  const [accountIds, setAccountIds] = useState([]);
  const [employeeIds, setEmployeeIds] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [formErrors, setFormErrors] = useState({});

  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;

  // Fetch user roles
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
    userRoles.includes("ManageExpense:read") && !userRoles.includes("ManageExpense:full access");
  const hasAccess =
    userRoles.includes("ManageExpense:read") || userRoles.includes("ManageExpense:full access");

  // Fetch data with real-time listener and where clauses
  useEffect(() => {
    if (loadingRoles || !hasAccess) return;

    const user = auth.currentUser;
    if (!user) {
      toast.error("No authenticated user");
      setLoadingData(false);
      return;
    }

    // Fetch expenses with real-time listener
    let expensesQuery = query(
      collection(db, "expenses"),
      where("accountId", "!=", null) // Ensure expenses have an account
    );
    if (isReadOnly) {
      expensesQuery = query(expensesQuery, where("createdBy", "==", user.uid));
    }

    const unsubscribeExpenses = onSnapshot(
      expensesQuery,
      (snapshot) => {
        const expensesData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            expenseId: data.expenseId || `EXP-${doc.id}`,
            category: data.category || "Other",
            amount: Number(data.amount) || 0,
            date: data.date || null,
            description: data.description || "",
            projectId: data.projectId || null,
            accountId: data.accountId || null,
            recurring: !!data.recurring,
            softwareName: data.softwareName || null,
            employeeIds: Array.isArray(data.employeeIds) ? data.employeeIds : [],
          };
        });
        setExpenses(expensesData);
        setLoadingData(false);
      },
      (error) => {
        toast.error("Error fetching expenses");
        console.error("Error fetching expenses:", error);
        setLoadingData(false);
      }
    );

    // Fetch reference data
    const fetchReferenceData = async () => {
      try {
        const projectsQuery = query(collection(db, "projects"), where("status", "==", "Active"));
        const accountsQuery = query(collection(db, "accounts"), where("status", "==", "Active"));
        const employeesQuery = query(collection(db, "employees"), where("status", "==", "Active"));

        const [projectsSnapshot, accountsSnapshot, employeesSnapshot] = await Promise.all([
          getDocs(projectsQuery),
          getDocs(accountsQuery),
          getDocs(employeesQuery),
        ]);

        setProjectIds(projectsSnapshot.docs.map((doc) => doc.data().projectId).filter(Boolean));
        setAccountIds(accountsSnapshot.docs.map((doc) => doc.data().accountId).filter(Boolean));
        setEmployeeIds(employeesSnapshot.docs.map((doc) => doc.data().employeeId).filter(Boolean));
      } catch (error) {
        toast.error("Error fetching reference data");
        console.error("Error fetching reference data:", error);
      }
    };

    fetchReferenceData();

    return () => unsubscribeExpenses();
  }, [loadingRoles, hasAccess, isReadOnly]);

  // Debounced search handler
  const handleSearch = useCallback(
    debounce((value) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  // Filter expenses using useMemo with robust error handling
  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((expense) => {
        try {
          return (
            (typeof expense.category === "string" &&
              expense.category.toLowerCase().includes(term)) ||
            (typeof expense.expenseId === "string" &&
              expense.expenseId.toLowerCase().includes(term)) ||
            (typeof expense.description === "string" &&
              expense.description.toLowerCase().includes(term)) ||
            (typeof expense.projectId === "string" &&
              expense.projectId.toLowerCase().includes(term))
          );
        } catch (error) {
          console.error("Error filtering expense:", expense, error);
          return false; // Exclude problematic expense
        }
      });
    }

    const now = new Date();
    switch (dateFilterType) {
      case "today":
        filtered = filtered.filter((expense) => {
          try {
            const expenseDate = expense.date?.toDate?.() || new Date(expense.date);
            if (isNaN(expenseDate.getTime())) return false;
            return (
              expenseDate.getDate() === now.getDate() &&
              expenseDate.getMonth() === now.getMonth() &&
              expenseDate.getFullYear() === now.getFullYear()
            );
          } catch (error) {
            console.error("Error filtering today:", expense, error);
            return false;
          }
        });
        break;
      case "week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        filtered = filtered.filter((expense) => {
          try {
            const expenseDate = expense.date?.toDate?.() || new Date(expense.date);
            if (isNaN(expenseDate.getTime())) return false;
            return expenseDate >= weekStart && expenseDate <= now;
          } catch (error) {
            console.error("Error filtering week:", expense, error);
            return false;
          }
        });
        break;
      case "month":
        filtered = filtered.filter((expense) => {
          try {
            const expenseDate = expense.date?.toDate?.() || new Date(expense.date);
            if (isNaN(expenseDate.getTime())) return false;
            return (
              expenseDate.getMonth() === now.getMonth() &&
              expenseDate.getFullYear() === now.getFullYear()
            );
          } catch (error) {
            console.error("Error filtering month:", expense, error);
            return false;
          }
        });
        break;
      case "3months":
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        filtered = filtered.filter((expense) => {
          try {
            const expenseDate = expense.date?.toDate?.() || new Date(expense.date);
            if (isNaN(expenseDate.getTime())) return false;
            return expenseDate >= threeMonthsAgo && expenseDate <= now;
          } catch (error) {
            console.error("Error filtering 3months:", expense, error);
            return false;
          }
        });
        break;
      case "year":
        filtered = filtered.filter((expense) => {
          try {
            const expenseDate = expense.date?.toDate?.() || new Date(expense.date);
            if (isNaN(expenseDate.getTime())) return false;
            return expenseDate.getFullYear() === now.getFullYear();
          } catch (error) {
            console.error("Error filtering year:", expense, error);
            return false;
          }
        });
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          filtered = filtered.filter((expense) => {
            try {
              const expenseDate = expense.date?.toDate?.() || new Date(expense.date);
              if (isNaN(expenseDate.getTime())) return false;
              return expenseDate >= customStartDate && expenseDate <= customEndDate;
            } catch (error) {
              console.error("Error filtering custom:", expense, error);
              return false;
            }
          });
        }
        break;
      default:
        break;
    }

    return filtered;
  }, [expenses, searchTerm, dateFilterType, customStartDate, customEndDate]);

  const handleClickOpen = () => {
    setOpen(true);
    resetForm();
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setCategory(expense.category);
    setAmount(expense.amount.toString());
    setDate(expense.date?.toDate?.() || (expense.date ? new Date(expense.date) : null));
    setDescription(expense.description);
    setProjectId(expense.projectId || "");
    setAccountId(expense.accountId || "");
    setRecurring(expense.recurring);
    setSoftwareName(expense.softwareName || "");
    setSelectedEmployeeIds(expense.employeeIds || []);
    setOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!category) errors.category = "Category is required";
    if (!amount || isNaN(amount) || Number(amount) <= 0) errors.amount = "Valid amount is required";
    if (!accountId) errors.accountId = "Account is required";
    if (!date || isNaN(date.getTime())) errors.date = "Valid date is required";
    if (category === "Software Licenses" && !softwareName)
      errors.softwareName = "Software name is required";
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

  const generateExpenseId = () => `EXP-${Math.floor(1000 + Math.random() * 9000)}`;

  const confirmUpdate = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("No authenticated user");
      setConfirmUpdateOpen(false);
      return;
    }

    const newExpense = {
      expenseId: editingExpense ? editingExpense.expenseId : generateExpenseId(),
      category,
      amount: Number(amount),
      date: Timestamp.fromDate(date),
      description: description || null,
      projectId: projectId || null,
      accountId,
      recurring,
      softwareName: category === "Software Licenses" ? softwareName : null,
      employeeIds: category === "Salaries" ? selectedEmployeeIds : null,
      createdBy: user.uid,
    };

    try {
      if (editingExpense) {
        await updateDoc(doc(db, "expenses", editingExpense.id), newExpense);
        toast.success("Expense updated successfully");
      } else {
        await addDoc(collection(db, "expenses"), newExpense);
        toast.success("Expense added successfully");
      }
      setConfirmUpdateOpen(false);
      handleClose();
    } catch (error) {
      toast.error("Error saving expense");
      console.error("Error saving expense:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "expenses", deleteId));
      toast.success("Expense deleted successfully");
      setConfirmDeleteOpen(false);
    } catch (error) {
      toast.error("Error deleting expense");
      console.error("Error deleting expense:", error);
    }
  };

  const resetForm = () => {
    setCategory("");
    setAmount("");
    setDate(null);
    setDescription("");
    setProjectId("");
    setAccountId("");
    setRecurring(false);
    setSoftwareName("");
    setSelectedEmployeeIds([]);
    setEditingExpense(null);
    setFormErrors({});
  };

  if (loadingRoles) {
    return <Box>Loading...</Box>;
  }

  if (!hasAccess) {
    return <Navigate to="/unauthorized" />;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
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
            left: { xs: "0", md: miniSidenav ? "80px" : "250px" },
            width: { xs: "100%", md: miniSidenav ? "calc(100% - 80px)" : "calc(100% - 250px)" },
          }}
        />
        <MDBox
          p={3}
          sx={{
            marginLeft: { xs: "0", md: miniSidenav ? "80px" : "250px" },
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
                    Expense Management
                  </MDTypography>
                </MDBox>
                <MDBox
                  pt={3}
                  pb={2}
                  px={2}
                  display="flex"
                  alignItems="center"
                  gap={2}
                  justifyContent="space-between"
                >
                  <Box display="flex" gap={2}>
                    {!isReadOnly && (
                      <MDButton
                        variant="gradient"
                        color={darkMode ? "dark" : "info"}
                        onClick={handleClickOpen}
                      >
                        Add Expense
                      </MDButton>
                    )}
                    <TextField
                      label="Search by Category, ID, Description, or Project"
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
                  </Box>
                  <Box display="flex" gap={2} alignItems="center">
                    <FormControl variant="outlined" size="small">
                      <InputLabel sx={{ color: darkMode ? "white" : "black" }}>
                        Date Filter
                      </InputLabel>
                      <Select
                        value={dateFilterType}
                        onChange={(e) => setDateFilterType(e.target.value)}
                        label="Date Filter"
                        sx={{
                          color: darkMode ? "white" : "black",
                          "& .MuiSvgIcon-root": { color: darkMode ? "white" : "black" },
                        }}
                      >
                        <MenuItem value="all">All Dates</MenuItem>
                        <MenuItem value="today">Today</MenuItem>
                        <MenuItem value="week">This Week</MenuItem>
                        <MenuItem value="month">This Month</MenuItem>
                        <MenuItem value="3months">Last 3 Months</MenuItem>
                        <MenuItem value="year">This Year</MenuItem>
                        <MenuItem value="custom">Custom Range</MenuItem>
                      </Select>
                    </FormControl>
                    {dateFilterType === "custom" && (
                      <>
                        <DatePicker
                          label="Start Date"
                          value={customStartDate}
                          onChange={(newValue) => setCustomStartDate(newValue)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              size="small"
                              sx={{
                                maxWidth: 150,
                                "& .MuiOutlinedInput-root": {
                                  backgroundColor: darkMode ? "#424242" : "#fff",
                                  color: darkMode ? "white" : "black",
                                },
                                "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                              }}
                            />
                          )}
                        />
                        <DatePicker
                          label="End Date"
                          value={customEndDate}
                          onChange={(newValue) => setCustomEndDate(newValue)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              size="small"
                              sx={{
                                maxWidth: 150,
                                "& .MuiOutlinedInput-root": {
                                  backgroundColor: darkMode ? "#424242" : "#fff",
                                  color: darkMode ? "white" : "black",
                                },
                                "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                              }}
                            />
                          )}
                        />
                      </>
                    )}
                  </Box>
                </MDBox>

                {loadingData ? (
                  <Box p={3} textAlign="center">
                    <Typography>Loading expenses...</Typography>
                  </Box>
                ) : filteredExpenses.length === 0 ? (
                  <Box p={3} textAlign="center">
                    <Typography>No expenses found</Typography>
                  </Box>
                ) : (
                  <Grid container spacing={3} sx={{ padding: "16px" }}>
                    {filteredExpenses.map((expense) => (
                      <Grid item xs={12} key={expense.id}>
                        <ExpenseCard
                          expense={expense}
                          onEdit={handleEdit}
                          onDelete={(id) => {
                            setDeleteId(id);
                            setConfirmDeleteOpen(true);
                          }}
                          darkMode={darkMode}
                          isReadOnly={isReadOnly}
                        />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Card>
            </Grid>
          </Grid>
        </MDBox>
        <Box
          sx={{
            marginLeft: { xs: "0", md: miniSidenav ? "80px" : "250px" },
            backgroundColor: darkMode ? "background.default" : "background.paper",
            zIndex: 1100,
          }}
        >
          <Footer />
        </Box>

        {!isReadOnly && (
          <>
            <Dialog
              open={open}
              onClose={handleClose}
              maxWidth="md"
              fullWidth
              sx={{
                "& .MuiDialog-paper": {
                  backgroundColor: darkMode ? "background.default" : "background.paper",
                },
              }}
            >
              <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
                {editingExpense ? "Edit Expense" : "Add Expense"}
              </DialogTitle>
              <DialogContent sx={{ py: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth error={!!formErrors.category}>
                      <InputLabel sx={{ color: darkMode ? "white" : "black" }}>Category</InputLabel>
                      <Select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        label="Category"
                        sx={{
                          color: darkMode ? "white" : "black",
                          "& .MuiSvgIcon-root": { color: darkMode ? "white" : "black" },
                        }}
                      >
                        {categories.map((cat) => (
                          <MenuItem key={cat} value={cat}>
                            {cat}
                          </MenuItem>
                        ))}
                      </Select>
                      {formErrors.category && (
                        <Typography color="error" variant="caption">
                          {formErrors.category}
                        </Typography>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth error={!!formErrors.accountId}>
                      <InputLabel sx={{ color: darkMode ? "white" : "black" }}>Account</InputLabel>
                      <Select
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        label="Account"
                        sx={{
                          color: darkMode ? "white" : "black",
                          "& .MuiSvgIcon-root": { color: darkMode ? "white" : "black" },
                        }}
                      >
                        {accountIds.map((acc) => (
                          <MenuItem key={acc} value={acc}>
                            {acc}
                          </MenuItem>
                        ))}
                      </Select>
                      {formErrors.accountId && (
                        <Typography color="error" variant="caption">
                          {formErrors.accountId}
                        </Typography>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      error={!!formErrors.amount}
                      helperText={formErrors.amount}
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="Date"
                      value={date}
                      onChange={(newValue) => setDate(newValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          error={!!formErrors.date}
                          helperText={formErrors.date}
                          sx={{
                            input: { color: darkMode ? "white" : "black" },
                            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      sx={{
                        input: { color: darkMode ? "white" : "black" },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Grid>
                  {category === "Project" && (
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel sx={{ color: darkMode ? "white" : "black" }}>
                          Project
                        </InputLabel>
                        <Select
                          value={projectId}
                          onChange={(e) => setProjectId(e.target.value)}
                          label="Project"
                          sx={{
                            color: darkMode ? "white" : "black",
                            "& .MuiSvgIcon-root": { color: darkMode ? "white" : "black" },
                          }}
                        >
                          {projectIds.map((proj) => (
                            <MenuItem key={proj} value={proj}>
                              {proj}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  {category === "Salaries" && (
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel sx={{ color: darkMode ? "white" : "black" }}>
                          Employee
                        </InputLabel>
                        <Select
                          multiple
                          value={selectedEmployeeIds}
                          onChange={(e) => setSelectedEmployeeIds(e.target.value)}
                          label="Employee"
                          sx={{
                            color: darkMode ? "white" : "black",
                            "& .MuiSvgIcon-root": { color: darkMode ? "white" : "black" },
                          }}
                        >
                          {employeeIds.map((emp) => (
                            <MenuItem key={emp} value={emp}>
                              {emp}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  {category === "Software Licenses" && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Software Name"
                        value={softwareName}
                        onChange={(e) => setSoftwareName(e.target.value)}
                        error={!!formErrors.softwareName}
                        helperText={formErrors.softwareName}
                        sx={{
                          input: { color: darkMode ? "white" : "black" },
                          "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                        }}
                      />
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={recurring}
                          onChange={(e) => setRecurring(e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Recurring Expense"
                      sx={{ color: darkMode ? "white" : "black" }}
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleClose} sx={{ color: darkMode ? "white" : "black" }}>
                  Cancel
                </Button>
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
                Confirm deletion of expense?
              </DialogTitle>
              <DialogActions>
                <Button
                  onClick={() => setConfirmDeleteOpen(false)}
                  sx={{ color: darkMode ? "white" : "black" }}
                >
                  Cancel
                </Button>
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
                Confirm saving expense details?
              </DialogTitle>
              <DialogActions>
                <Button
                  onClick={() => setConfirmUpdateOpen(false)}
                  sx={{ color: darkMode ? "white" : "black" }}
                >
                  Cancel
                </Button>
                <Button onClick={confirmUpdate} color="primary">
                  Confirm
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default ManageExpenses;