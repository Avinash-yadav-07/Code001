import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import "react-toastify/dist/ReactToastify.css";
import {
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Grid,
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
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useMaterialUIController } from "context";
import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import { debounce } from "lodash";
import * as XLSX from "xlsx";
import { casual } from "chrono-node";

const categories = [
  "Rent",
  "Software Licenses",
  "Utilities",
  "Salaries",
  "Marketing",
  "Other",
  "Project",
];

// Common styles from ManageCustomer
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

// Utility function to clean numeric values
const cleanNumericValue = (value) => {
  if (typeof value === "string") {
    return parseFloat(value.replace(/[^0-9.-]+/g, "")) || 0;
  }
  return parseFloat(value) || 0;
};

// Utility function to validate date strings
const validateDate = (dateStr) => {
  const parsed = casual.parseDate(dateStr);
  return parsed ? parsed : null;
};

// Check if an ID is unique in Firestore
const checkUniqueId = async (collectionName, field, value, excludeDocId = null) => {
  try {
    const q = query(collection(db, collectionName), where(field, "==", value));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.every((doc) => doc.id !== excludeDocId);
  } catch (error) {
    console.error(`Error checking unique ${field}:`, error);
    return false;
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
      "&:hover": { boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)", transform: "scale(1.02)" },
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
        backgroundColor: expense.category === "Salaries" ? "#4caf50" : darkMode ? "#90A4AE" : "#B0BEC5",
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
        {expense.category}
      </MDTypography>
    </Box>
    <Box sx={{ flexGrow: 1, width: { xs: "100%", sm: "auto" } }}>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
              <span>Expense ID: </span>
              <span style={{ fontWeight: "bold" }}>{expense.expenseId}</span>
            </MDTypography>
            <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
              <span>Amount: </span>
              <span style={{ fontWeight: "bold" }}>${expense.amount.toFixed(2)}</span>
            </MDTypography>
            <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
              <span>Date: </span>
              <span style={{ fontWeight: "bold" }}>{formatDate(expense.date)}</span>
            </MDTypography>
            <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
              <span>Description: </span>
              <span style={{ fontWeight: "bold" }}>{expense.description || "N/A"}</span>
            </MDTypography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
              <span>Project: </span>
              <span style={{ fontWeight: "bold" }}>
                {expense.projectName ? `${expense.projectName} (${expense.projectId || "N/A"})` : "N/A"}
              </span>
            </MDTypography>
            <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
              <span>Account: </span>
              <span style={{ fontWeight: "bold" }}>
                {expense.accountName ? `${expense.accountName} (${expense.accountId || "N/A"})` : "N/A"}
              </span>
            </MDTypography>
            <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
              <span>Recurring: </span>
              <span style={{ fontWeight: "bold" }}>{expense.recurring ? "Yes" : "No"}</span>
            </MDTypography>
            <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
              <span>Software Name: </span>
              <span style={{ fontWeight: "bold" }}>{expense.softwareName || "N/A"}</span>
            </MDTypography>
            <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
              <span>Employee IDs: </span>
              <span style={{ fontWeight: "bold" }}>{expense.employeeIds?.join(", ") || "N/A"}</span>
            </MDTypography>
          </Grid>
        </Grid>
      </CardContent>
      {!isReadOnly && (
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
            color={darkMode ? "dark" : "info"}
            onClick={() => onEdit(expense)}
            sx={{
              flex: { xs: "1 1 calc(50% - 8px)", sm: "0 0 auto" },
              minWidth: { xs: "100px", sm: "100px" },
              maxWidth: { xs: "calc(50% - 8px)", sm: "100px" },
              padding: "8px 16px",
              fontSize: "14px",
            }}
          >
            <Icon fontSize="medium">edit</Icon> Edit
          </MDButton>
          <MDButton
            variant="gradient"
            color="error"
            onClick={() => onDelete(expense.id)}
            sx={{
              flex: { xs: "1 1 calc(50% - 8px)", sm: "0 0 auto" },
              minWidth: { xs: "100px", sm: "100px" },
              maxWidth: { xs: "calc(50% - 8px)", sm: "100px" },
              padding: "8px 16px",
              fontSize: "14px",
            }}
          >
            <Icon fontSize="medium">delete</Icon> Delete
          </MDButton>
        </CardActions>
      )}
    </Box>
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
    projectName: PropTypes.string,
    accountName: PropTypes.string,
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
  const [datePickerOpen, setDatePickerOpen] = useState(false);
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
  const [projects, setProjects] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [employeeIds, setEmployeeIds] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [formErrors, setFormErrors] = useState({});
  const [excelOption, setExcelOption] = useState("");

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
    userRoles.includes("ManageExpense:read") &&
    !userRoles.includes("ManageExpense:full access");
  const hasAccess =
    userRoles.includes("ManageExpense:read") ||
    userRoles.includes("ManageExpense:full access");

  // Fetch data with real-time listener
  useEffect(() => {
    if (loadingRoles || !hasAccess) return;

    const user = auth.currentUser;
    if (!user) {
      toast.error("No authenticated user");
      setLoadingData(false);
      return;
    }

    const fetchReferenceData = async () => {
      try {
        const projectsQuery = query(collection(db, "projects"), where("status", "in", ["Active", "Ongoing"]));
        const accountsQuery = query(collection(db, "accounts"), where("status", "==", "Active"));
        const employeesQuery = query(collection(db, "employees"), where("status", "==", "Active"));

        const [projectsSnapshot, accountsSnapshot, employeesSnapshot] = await Promise.all([
          getDocs(projectsQuery),
          getDocs(accountsQuery),
          getDocs(employeesQuery),
        ]);

        const fetchedProjects = projectsSnapshot.docs
          .map((doc) => ({
            projectId: doc.data().projectId,
            projectName: doc.data().name || "Unknown",
          }))
          .filter((p) => p.projectId);
        setProjects(fetchedProjects);
        setAccounts(
          accountsSnapshot.docs
            .map((doc) => ({
              accountId: doc.data().accountId,
              accountName: doc.data().name || "Unknown",
            }))
            .filter((a) => a.accountId)
        );
        setEmployeeIds(
          employeesSnapshot.docs
            .map((doc) => doc.data().employeeId)
            .filter(Boolean)
        );
      } catch (error) {
        toast.error("Error fetching reference data");
        console.error("Error fetching reference data:", error);
      }
    };

    fetchReferenceData();

    let expensesQuery = query(collection(db, "expenses"), where("accountId", "!=", null));
    if (isReadOnly) {
      expensesQuery = query(expensesQuery, where("createdBy", "==", user.uid));
    }

    const unsubscribeExpenses = onSnapshot(
      expensesQuery,
      (snapshot) => {
        const projectMap = new Map(projects.map((p) => [p.projectId, p.projectName]));
        const accountMap = new Map(accounts.map((a) => [a.accountId, a.accountName]));

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
            projectName: data.projectId ? projectMap.get(data.projectId) || "Unknown" : null,
            accountName: data.accountId ? accountMap.get(data.accountId) || "Unknown" : null,
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

    return () => unsubscribeExpenses();
  }, [loadingRoles, hasAccess, isReadOnly, projects, accounts]);

  // Handle Excel option change
  const handleExcelOptionChange = (event) => {
    const option = event.target.value;
    setExcelOption(option);

    if (option === "upload") {
      document.getElementById("file-upload").click();
    } else if (option === "download") {
      handleDownloadExcel();
    } else if (option === "downloadDummy") {
      handleDownloadDummyExcel();
    }

    setExcelOption("");
  };

  // Handle Excel file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const user = auth.currentUser;
    if (!user) {
      toast.error("No authenticated user");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
          blankrows: false,
        });

        const validProjectIds = projects.map((p) => p.projectId);
        const validAccountIds = accounts.map((a) => a.accountId);
        const validEmployeeIds = employeeIds;

        const normalizeColumnName = (name) => {
          if (!name) return "";
          const cleanName = name.trim().toLowerCase().replace(/\s+/g, "");
          if (cleanName.includes("expenseid")) return "Expense ID";
          if (cleanName.includes("category")) return "Category";
          if (cleanName.includes("amount")) return "Amount";
          if (cleanName.includes("date")) return "Date";
          if (cleanName.includes("description")) return "Description";
          if (cleanName.includes("projectid")) return "Project ID";
          if (cleanName.includes("accountid")) return "Account ID";
          if (cleanName.includes("recurring")) return "Recurring";
          if (cleanName.includes("softwarename")) return "Software Name";
          if (cleanName.includes("employeeids")) return "Employee IDs";
          return name;
        };

        const normalizedData = jsonData.map((row) => {
          const normalizedRow = {};
          Object.keys(row).forEach((key) => {
            normalizedRow[normalizeColumnName(key)] = row[key];
          });
          return normalizedRow;
        });

        for (const expense of normalizedData) {
          let newExpenseId = generateExpenseId();
          let attempts = 0;
          const maxAttempts = 10;

          while (attempts < maxAttempts) {
            const isExpenseIdUnique = await checkUniqueId("expenses", "expenseId", newExpenseId);
            if (isExpenseIdUnique) break;
            newExpenseId = generateExpenseId();
            attempts++;
          }

          if (attempts >= maxAttempts) {
            console.error("Could not generate unique expense ID");
            toast.error("Failed to generate unique expense ID. Please try again.");
            return;
          }

          if (!expense["Category"]?.trim() || !expense["Amount"] || !expense["Date"] || !expense["Account ID"]?.trim()) {
            console.error("Missing required fields in expense:", expense["Expense ID"]);
            toast.error(`Missing required fields for expense ${expense["Expense ID"] || "unknown"}. Required: Category, Amount, Date, Account ID.`);
            return;
          }

          const normalizedCategory = expense["Category"].trim();
          if (!categories.map((c) => c.toLowerCase()).includes(normalizedCategory.toLowerCase())) {
            console.error("Invalid category for expense:", expense["Expense ID"]);
            toast.error(`Invalid category "${expense["Category"]}" for expense ${expense["Expense ID"] || "unknown"}.`);
            return;
          }

          const amount = cleanNumericValue(expense["Amount"]);
          if (amount <= 0) {
            console.error("Invalid amount for expense:", expense["Expense ID"]);
            toast.error(`Amount must be positive for expense ${expense["Expense ID"] || "unknown"}.`);
            return;
          }

          let expenseDate = expense["Date"];
          if (expenseDate instanceof Date) {
            expenseDate = expenseDate.toISOString().substring(0, 10);
          } else {
            expenseDate = validateDate(expense["Date"]?.toString());
          }
          if (!expenseDate) {
            console.error("Invalid date for expense:", expense["Expense ID"]);
            toast.error(`Invalid date "${expense["Date"]}" for expense ${expense["Expense ID"] || "unknown"}.`);
            return;
          }

          const accountId = expense["Account ID"]?.trim();
          if (!validAccountIds.includes(accountId)) {
            console.error("Invalid account ID for expense:", expense["Expense ID"]);
            toast.error(`Invalid account ID "${expense["Account ID"]}" for expense ${expense["Expense ID"] || "unknown"}.`);
            return;
          }

          let projectId = expense["Project ID"]?.trim();
          if (projectId && !validProjectIds.includes(projectId)) {
            projectId = null;
          }

          const softwareName = expense["Software Name"]?.trim();
          if (normalizedCategory.toLowerCase() === "software licenses" && !softwareName) {
            console.error("Software name required for Software Licenses:", expense["Expense ID"]);
            toast.error(`Software name is required for Software Licenses category for expense ${expense["Expense ID"] || "unknown"}.`);
            return;
          }

          let employeeIds = [];
          if (normalizedCategory.toLowerCase() === "salaries" && expense["Employee IDs"]) {
            employeeIds = expense["Employee IDs"].toString().split(",").map((id) => id.trim()).filter((id) => id && validEmployeeIds.includes(id));
            if (employeeIds.length === 0) {
              console.error("No valid employee IDs for Salaries:", expense["Expense ID"]);
              toast.error(`At least one valid employee ID is required for Salaries category for expense ${expense["Expense ID"] || "unknown"}.`);
              return;
            }
          }

          const recurring = expense["Recurring"]?.toString().toLowerCase() === "yes" || expense["Recurring"] === true;

          const newExpense = {
            expenseId: newExpenseId,
            category: normalizedCategory,
            amount: amount,
            date: Timestamp.fromDate(new Date(expenseDate)),
            description: expense["Description"]?.toString().trim() || null,
            projectId: projectId || null,
            accountId: accountId,
            recurring: recurring,
            softwareName: normalizedCategory.toLowerCase() === "software licenses" ? softwareName : null,
            employeeIds: normalizedCategory.toLowerCase() === "salaries" ? employeeIds : null,
            createdBy: user.uid,
          };

          try {
            await addDoc(collection(db, "expenses"), newExpense);
          } catch (error) {
            console.error("Error adding expense from Excel:", error);
            toast.error(`Failed to add expense ${expense["Expense ID"] || "unknown"}. Error: ${error.message}`);
            return;
          }
        }
        toast.success("Expenses imported successfully!");
      } catch (error) {
        console.error("Error processing Excel file:", error);
        toast.error("Failed to process Excel file. Please ensure it contains the required fields (Category, Amount, Date, Account ID) and is in a valid format (.xlsx, .xls, .csv).");
      }
    };

    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  // Handle Excel download
  const handleDownloadExcel = () => {
    const exportData = expenses.map((expense) => ({
      "Expense ID": expense.expenseId,
      Category: expense.category,
      Amount: expense.amount.toFixed(2),
      Date: formatDate(expense.date),
      Description: expense.description || "N/A",
      "Project ID": expense.projectId || "N/A",
      "Account ID": expense.accountId || "N/A",
      Recurring: expense.recurring ? "Yes" : "No",
      "Software Name": expense.softwareName || "N/A",
      "Employee IDs": Array.isArray(expense.employeeIds) ? expense.employeeIds.join(", ") : "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
    XLSX.writeFile(workbook, "expenses_export.xlsx");
  };

  // Handle dummy Excel download
  const handleDownloadDummyExcel = () => {
    const dummyData = [
      {
        "Expense ID": "",
        Category: "",
        Amount: "",
        Date: "",
        Description: "",
        "Project ID": "",
        "Account ID": "",
        Recurring: "",
        "Software Name": "",
        "Employee IDs": "",
      },
    ];

    const worksheet = XLSX.utils.sheet_to_json(dummyData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
    XLSX.writeFile(workbook, "expenses_dummy.xlsx");
  };

  // Debounced search handler
  const handleSearch = useCallback(
    debounce((value) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((expense) => {
        try {
          return (
            (typeof expense.category === "string" && expense.category.toLowerCase().includes(term)) ||
            (typeof expense.expenseId === "string" && expense.expenseId.toLowerCase().includes(term)) ||
            (typeof expense.description === "string" && expense.description.toLowerCase().includes(term)) ||
            (typeof expense.projectId === "string" && expense.projectId.toLowerCase().includes(term))
          );
        } catch (error) {
          console.error("Error filtering expense:", expense, error);
          return false;
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
        const threeMonthsAgo = new Date();
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
    if (!amount || isNaN(amount) || Number(amount) <= 0) errors.amount = "Amount must be positive";
    if (!accountId) errors.accountId = "Account is required";
    if (!date || isNaN(date.getTime())) errors.date = "Date is required";
    if (category === "Software Licenses" && !softwareName) errors.softwareName = "Software name is required";
    if (category === "Salaries" && selectedEmployeeIds.length === 0) errors.employeeIds = "At least one employee ID is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please correct the form errors");
      return;
    }
    setConfirmUpdateOpen(true);
  };

  const generateExpenseId = () => `EXP-${Math.floor(1000 + Math.random() * 9000)}`;

  const confirmUpdate = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("No authenticated user found");
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
        toast.success("Expense successfully updated");
      } else {
        await addDoc(collection(db, "expenses"), newExpense);
        toast.success("Expense successfully added");
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
      toast.success("Expense successfully deleted");
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
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>Loading...</MDTypography>
      </Box>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/unauthorized" />;
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
                  Expense Management
                </MDTypography>
              </MDBox>
              <MDBox
                pt={3}
                pb={2}
                px={2}
                display="flex"
                flexDirection={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "stretch", sm: "center" }}
                gap={2}
                justifyContent="space-between"
              >
                <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} gap={2} width={{ xs: "100%", sm: "auto" }}>
                  {!isReadOnly && (
                    <>
                      <MDButton
                        variant="gradient"
                        color={darkMode ? "dark" : "info"}
                        onClick={handleClickOpen}
                        fullWidth={{ xs: true, sm: false }}
                      >
                        Add Expense
                      </MDButton>
                      <select
                        value={excelOption}
                        onChange={handleExcelOptionChange}
                        style={formSelectStyle}
                      >
                        <option value="" disabled>Select Excel Option</option>
                        <option value="upload">Upload Excel</option>
                        <option value="download">Download Excel</option>
                        <option value="downloadDummy">Download Dummy Excel</option>
                      </select>
                      <input
                        id="file-upload"
                        type="file"
                        hidden
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                      />
                    </>
                  )}
                  <input
                    type="text"
                    placeholder="Search by Category, ID, Description, or Project"
                    onChange={(e) => handleSearch(e.target.value)}
                    style={formInputStyle}
                  />
                </Box>
                <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} gap={2} alignItems={{ xs: "stretch", sm: "center" }} width={{ xs: "100%", sm: "auto" }}>
                  <select
                    value={dateFilterType}
                    onChange={(e) => setDateFilterType(e.target.value)}
                    style={formSelectStyle}
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="3months">Last 3 Months</option>
                    <option value="year">This Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  {dateFilterType === "custom" && (
                    <Button
                      variant="outlined"
                      onClick={() => setDatePickerOpen(true)}
                      sx={{
                        height: 40,
                        color: darkMode ? "white" : "black",
                        borderColor: darkMode ? "white" : "black",
                        width: { xs: "100%", sm: "auto" },
                      }}
                    >
                      Choose Dates
                    </Button>
                  )}
                </Box>
              </MDBox>

              <Box sx={{ ...formContainerStyle, display: datePickerOpen ? "block" : "none" }}>
                <form onSubmit={(e) => { e.preventDefault(); setDatePickerOpen(false); }}>
                  <Typography sx={formHeadingStyle}>Select Date Range</Typography>
                  <label style={formLabelStyle}>Start Date*</label>
                  <input
                    type="date"
                    value={customStartDate ? customStartDate.toISOString().split("T")[0] : ""}
                    onChange={(e) => setCustomStartDate(e.target.value ? new Date(e.target.value) : null)}
                    required
                    style={formInputStyle}
                  />
                  <label style={formLabelStyle}>End Date*</label>
                  <input
                    type="date"
                    value={customEndDate ? customEndDate.toISOString().split("T")[0] : ""}
                    onChange={(e) => setCustomEndDate(e.target.value ? new Date(e.target.value) : null)}
                    required
                    style={formInputStyle}
                  />
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <button type="button" onClick={() => setDatePickerOpen(false)} style={formButtonStyle}>Cancel</button>
                    <button type="submit" style={formButtonStyle}>Apply</button>
                  </Box>
                </form>
              </Box>

              {loadingData ? (
                <Box p={3} sx={{ textAlign: "center" }}>
                  <Typography>Loading...</Typography>
                </Box>
              ) : filteredExpenses.length === 0 ? (
                <Box p={3} sx={{ textAlign: "center" }}>
                  <Typography>No expenses were found</Typography>
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
      <Box sx={{ marginLeft: { xs: "0", md: miniSidenav ? "80px" : "250px" }, backgroundColor: darkMode ? "#212121" : "#f3f3f3" }}>
        <Footer />
      </Box>

      {!isReadOnly && (
        <>
          <Box sx={{ ...formContainerStyle, display: open ? "block" : "none" }}>
            <form onSubmit={handleSubmit}>
              <Typography sx={formHeadingStyle}>{editingExpense ? "Edit Expense" : "Add Expense"}</Typography>
              <label style={formLabelStyle}>Category*</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                style={{ ...formSelectStyle, borderColor: formErrors.category ? "red" : "#ddd" }}
              >
                <option value="" disabled>Select Category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {formErrors.category && (
                <span style={{ color: "red", fontSize: "12px" }}>{formErrors.category}</span>
              )}
              <label style={formLabelStyle}>Account*</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                style={{ ...formSelectStyle, borderColor: formErrors.accountId ? "red" : "#ddd" }}
              >
                <option value="" disabled>Select Account</option>
                {accounts.map((acc) => (
                  <option key={acc.accountId} value={acc.accountId}>{acc.accountName}</option>
                ))}
              </select>
              {formErrors.accountId && (
                <span style={{ color: "red", fontSize: "12px" }}>{formErrors.accountId}</span>
              )}
              <label style={formLabelStyle}>Amount*</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter Amount"
                required
                style={{ ...formInputStyle, borderColor: formErrors.amount ? "red" : "#ddd" }}
              />
              {formErrors.amount && (
                <span style={{ color: "red", fontSize: "12px" }}>{formErrors.amount}</span>
              )}
              <label style={formLabelStyle}>Date*</label>
              <input
                type="date"
                value={date ? date.toISOString().split("T")[0] : ""}
                onChange={(e) => setDate(e.target.value ? new Date(e.target.value) : null)}
                required
                style={{ ...formInputStyle, borderColor: formErrors.date ? "red" : "#ddd" }}
              />
              {formErrors.date && (
                <span style={{ color: "red", fontSize: "12px" }}>{formErrors.date}</span>
              )}
              <label style={formLabelStyle}>Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter Description"
                style={formInputStyle}
              />
              <label style={formLabelStyle}>Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                style={formSelectStyle}
              >
                <option value="">None</option>
                {projects.length === 0 ? (
                  <option disabled>No projects available</option>
                ) : (
                  projects.map((proj) => (
                    <option key={proj.projectId} value={proj.projectId}>{proj.projectName}</option>
                  ))
                )}
              </select>
              {category === "Software Licenses" && (
                <>
                  <label style={formLabelStyle}>Software Name*</label>
                  <input
                    type="text"
                    value={softwareName}
                    onChange={(e) => setSoftwareName(e.target.value)}
                    placeholder="Enter Software Name"
                    required
                    style={{ ...formInputStyle, borderColor: formErrors.softwareName ? "red" : "#ddd" }}
                  />
                  {formErrors.softwareName && (
                    <span style={{ color: "red", fontSize: "12px" }}>{formErrors.softwareName}</span>
                  )}
                </>
              )}
              {category === "Salaries" && (
                <>
                  <label style={formLabelStyle}>Employee IDs*</label>
                  <Box sx={{ maxHeight: "100px", overflowY: "auto", mb: 1 }}>
                    {employeeIds.map((emp) => (
                      <Box
                        key={emp}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          mb: "4px",
                          flexWrap: "wrap",
                        }}
                      >
                        <input
                          type="checkbox"
                          id={`emp-${emp}`}
                          checked={selectedEmployeeIds.includes(emp)}
                          onChange={() => {
                            setSelectedEmployeeIds((prev) =>
                              prev.includes(emp) ? prev.filter((id) => id !== emp) : [...prev, emp]
                            );
                          }}
                          style={formCheckboxStyle}
                        />
                        <label
                          htmlFor={`emp-${emp}`}
                          style={{
                            ...formLabelStyle,
                            display: "inline",
                            marginLeft: "5px",
                            fontWeight: "normal",
                            flex: "1",
                            wordBreak: "break-word",
                          }}
                        >
                          {emp}
                        </label>
                      </Box>
                    ))}
                  </Box>
                  {formErrors.employeeIds && (
                    <span style={{ color: "red", fontSize: "12px" }}>{formErrors.employeeIds}</span>
                  )}
                </>
              )}
              <label style={formLabelStyle}>Recurring Expense</label>
              <Box sx={{ display: "flex", alignItems: "center", mb: "4px" }}>
                <input
                  type="checkbox"
                  id="recurring"
                  checked={recurring}
                  onChange={(e) => setRecurring(e.target.checked)}
                  style={formCheckboxStyle}
                />
                <label
                  htmlFor="recurring"
                  style={{
                    ...formLabelStyle,
                    display: "inline",
                    marginLeft: "5px",
                    fontWeight: "normal",
                  }}
                >
                  Recurring
                </label>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <button type="button" onClick={handleClose} style={formButtonStyle}>Cancel</button>
                <button type="submit" style={formButtonStyle}>Save</button>
              </Box>
            </form>
          </Box>

          <Box sx={{ ...formContainerStyle, display: confirmDeleteOpen ? "block" : "none" }}>
            <Typography sx={formHeadingStyle}>Confirm Deletion</Typography>
            <Typography sx={{ fontSize: "14px", color: "#555", mb: 2 }}>
              Are you sure you want to delete this expense?
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                style={formButtonStyle}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                style={{ ...formButtonStyle, backgroundColor: "#d32f2f" }}
              >
                Delete
              </button>
            </Box>
          </Box>

          <Box sx={{ ...formContainerStyle, display: confirmUpdateOpen ? "block" : "none" }}>
            <Typography sx={formHeadingStyle}>Confirm Save</Typography>
            <Typography sx={{ fontSize: "14px", color: "#555", mb: 2 }}>
              Confirm saving expense details?
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <button
                type="button"
                onClick={() => setConfirmUpdateOpen(false)}
                style={formButtonStyle}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmUpdate}
                style={formButtonStyle}
              >
                Confirm
              </button>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default ManageExpenses;