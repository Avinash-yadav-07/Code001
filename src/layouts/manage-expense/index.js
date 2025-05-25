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
const checkUniqueId = async (
  collectionName,
  field,
  value,
  excludeDocId = null
) => {
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
          <MDTypography
            variant="body2"
            color={darkMode ? "white" : "textSecondary"}
          >
            <span>Expense ID: </span>
            <span style={{ fontWeight: "bold" }}>{expense.expenseId}</span>
          </MDTypography>
          <MDTypography
            variant="body2"
            color={darkMode ? "white" : "textSecondary"}
          >
            <span>Amount: </span>
            <span style={{ fontWeight: "bold" }}>
              ${expense.amount.toFixed(2)}
            </span>
          </MDTypography>
          <MDTypography
            variant="body2"
            color={darkMode ? "white" : "textSecondary"}
          >
            <span>Date: </span>
            <span style={{ fontWeight: "bold" }}>
              {formatDate(expense.date)}
            </span>
          </MDTypography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <MDTypography
            variant="body2"
            color={darkMode ? "white" : "textSecondary"}
          >
            <span>Description: </span>
            <span style={{ fontWeight: "bold" }}>
              {expense.description || "N/A"}
            </span>
          </MDTypography>
          <MDTypography
            variant="body2"
            color={darkMode ? "white" : "textSecondary"}
          >
            <span>Project: </span>
            <span style={{ fontWeight: "bold" }}>
              {expense.projectName
                ? `${expense.projectName} (${expense.projectId || "N/A"})`
                : "N/A"}
            </span>
          </MDTypography>
          <MDTypography
            variant="body2"
            color={darkMode ? "white" : "textSecondary"}
          >
            <span>Account: </span>
            <span style={{ fontWeight: "bold" }}>
              {expense.accountName
                ? `${expense.accountName} (${expense.accountId || "N/A"})`
                : "N/A"}
            </span>
          </MDTypography>
          <MDTypography
            variant="body2"
            color={darkMode ? "white" : "textSecondary"}
          >
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
        <MDButton
          variant="gradient"
          color="error"
          onClick={() => onDelete(expense.id)}
        >
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
        const q = query(
          collection(db, "users"),
          where("email", "==", user.email)
        );
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

  // Fetch data with real-time listener and where clauses
  useEffect(() => {
    if (loadingRoles || !hasAccess) return;

    const user = auth.currentUser;
    if (!user) {
      toast.error("No authenticated user");
      setLoadingData(false);
      return;
    }

    // Fetch reference data first
    const fetchReferenceData = async () => {
      try {
        const projectsQuery = query(
          collection(db, "projects"),
          where("status", "in", ["Active", "Ongoing"])
        );
        const accountsQuery = query(
          collection(db, "accounts"),
          where("status", "==", "Active")
        );
        const employeesQuery = query(
          collection(db, "employees"),
          where("status", "==", "Active")
        );

        const [projectsSnapshot, accountsSnapshot, employeesSnapshot] =
          await Promise.all([
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
        console.log("Fetched projects:", fetchedProjects);
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

    // Fetch expenses with real-time listener
    let expensesQuery = query(
      collection(db, "expenses"),
      where("accountId", "!=", null)
    );
    if (isReadOnly) {
      expensesQuery = query(expensesQuery, where("createdBy", "==", user.uid));
    }

    const unsubscribeExpenses = onSnapshot(
      expensesQuery,
      (snapshot) => {
        // Create maps from existing state
        const projectMap = new Map(
          projects.map((p) => [p.projectId, p.projectName])
        );
        const accountMap = new Map(
          accounts.map((a) => [a.accountId, a.accountName])
        );

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
            employeeIds: Array.isArray(data.employeeIds)
              ? data.employeeIds
              : [],
            projectName: data.projectId
              ? projectMap.get(data.projectId) || "Unknown"
              : null,
            accountName: data.accountId
              ? accountMap.get(data.accountId) || "Unknown"
              : null,
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

    // Reset the select value after action
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

        // Normalize column names for Excel import
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

          // Ensure unique expense ID
          while (attempts < maxAttempts) {
            const isExpenseIdUnique = await checkUniqueId(
              "expenses",
              "expenseId",
              newExpenseId
            );
            if (isExpenseIdUnique) break;
            newExpenseId = generateExpenseId();
            attempts++;
          }

          if (attempts >= maxAttempts) {
            console.error("Could not generate unique expense ID");
            toast.error(
              "Failed to generate unique expense ID. Please try again."
            );
            return;
          }

          // Validate required fields
          if (
            !expense["Category"]?.trim() ||
            !expense["Amount"] ||
            !expense["Date"] ||
            !expense["Account ID"]?.trim()
          ) {
            console.error(
              "Missing required fields in expense:",
              expense["Expense ID"]
            );
            toast.error(
              `Missing required fields for expense ${
                expense["Expense ID"] || "unknown"
              }. Required: Category, Amount, Date, Account ID.`
            );
            return;
          }

          // Validate category
          const normalizedCategory = expense["Category"].trim();
          if (
            !categories
              .map((c) => c.toLowerCase())
              .includes(normalizedCategory.toLowerCase())
          ) {
            console.error(
              "Invalid category for expense:",
              expense["Expense ID"]
            );
            toast.error(
              `Invalid category "${expense["Category"]}" for expense ${
                expense["Expense ID"] || "unknown"
              }.`
            );
            return;
          }

          // Validate amount
          const amount = cleanNumericValue(expense["Amount"]);
          if (amount <= 0) {
            console.error("Invalid amount for expense:", expense["Expense ID"]);
            toast.error(
              `Amount must be positive for expense ${
                expense["Expense ID"] || "unknown"
              }.`
            );
            return;
          }

          // Validate date
          let expenseDate = expense["Date"];
          if (expenseDate instanceof Date) {
            expenseDate = expenseDate.toISOString().substring(0, 10);
          } else {
            expenseDate = validateDate(expense["Date"]?.toString());
          }
          if (!expenseDate) {
            console.error("Invalid date for expense:", expense["Expense ID"]);
            toast.error(
              `Invalid date "${expense["Date"]}" for expense ${
                expense["Expense ID"] || "unknown"
              }.`
            );
            return;
          }

          // Validate account ID
          const accountId = expense["Account ID"]?.trim();
          if (!validAccountIds.includes(accountId)) {
            console.error(
              "Invalid account ID for expense:",
              expense["Expense ID"]
            );
            toast.error(
              `Invalid account ID "${expense["Account ID"]}" for expense ${
                expense["Expense ID"] || "unknown"
              }.`
            );
            return;
          }

          // Validate project ID
          let projectId = expense["Project ID"]?.trim();
          if (projectId && !validProjectIds.includes(projectId)) {
            projectId = null; // Ignore invalid project IDs
          }

          // Validate software name for Software Licenses
          const softwareName = expense["Software Name"]?.trim();
          if (
            normalizedCategory.toLowerCase() === "software licenses" &&
            !softwareName
          ) {
            console.error(
              "Software name required for Software Licenses:",
              expense["Expense ID"]
            );
            toast.error(
              `Software name is required for Software Licenses category for expense ${
                expense["Expense ID"] || "unknown"
              }.`
            );
            return;
          }

          // Validate employee IDs for Salaries
          let employeeIds = [];
          if (
            normalizedCategory.toLowerCase() === "salaries" &&
            expense["Employee IDs"]
          ) {
            employeeIds = expense["Employee IDs"]
              .toString()
              .split(",")
              .map((id) => id.trim())
              .filter((id) => id && validEmployeeIds.includes(id));
            if (employeeIds.length === 0) {
              console.error(
                "No valid employee IDs for Salaries:",
                expense["Expense ID"]
              );
              toast.error(
                `At least one valid employee ID is required for Salaries category for expense ${
                  expense["Expense ID"] || "unknown"
                }.`
              );
              return;
            }
          }

          // Process recurring
          const recurring =
            expense["Recurring"]?.toString().toLowerCase() === "yes" ||
            expense["Recurring"] === true;

          // Create new expense object
          const newExpense = {
            expenseId: newExpenseId,
            category: normalizedCategory,
            amount: amount,
            date: Timestamp.fromDate(new Date(expenseDate)),
            description: expense["Description"]?.toString().trim() || null,
            projectId: projectId || null,
            accountId: accountId,
            recurring: recurring,
            softwareName:
              normalizedCategory.toLowerCase() === "software licenses"
                ? softwareName
                : null,
            employeeIds:
              normalizedCategory.toLowerCase() === "salaries"
                ? employeeIds
                : null,
            createdBy: user.uid,
          };

          // Save expense to Firestore
          try {
            await addDoc(collection(db, "expenses"), newExpense);
          } catch (error) {
            console.error("Error adding expense from Excel:", error);
            toast.error(
              `Failed to add expense ${
                expense["Expense ID"] || "unknown"
              }. Error: ${error.message}`
            );
            return;
          }
        }
        toast.success("Expenses imported successfully!");
      } catch (error) {
        console.error("Error processing Excel file:", error);
        toast.error(
          "Failed to process Excel file. Please ensure it contains the required fields (Category, Amount, Date, Account ID) and is in a valid format (.xlsx, .xls, .csv)."
        );
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
      "Employee IDs": Array.isArray(expense.employeeIds)
        ? expense.employeeIds.join(", ")
        : "N/A",
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

    const worksheet = XLSX.utils.json_to_sheet(dummyData);
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
            const expenseDate =
              expense.date?.toDate?.() || new Date(expense.date);
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
            const expenseDate =
              expense.date?.toDate?.() || new Date(expense.date);
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
            const expenseDate =
              expense.date?.toDate()?.() || new Date(expense.date);
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
            const expenseDate =
              expense.date?.toDate?.() || new Date(expense.date);
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
            const expenseDate =
              expense.date?.toDate?.() || new Date(expense.date);
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
              const expenseDate =
                expense.date?.toDate?.() || new Date(expense.date);
              if (isNaN(expenseDate.getTime())) return false;
              return (
                expenseDate >= customStartDate && expenseDate <= customEndDate
              );
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
    setDate(
      expense.date?.toDate?.() || (expense.date ? new Date(expense.date) : null)
    );
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
    if (!category) errors.category = "Invalid category is required";
    if (!amount || isNaN(amount) || Number(amount) <= 0)
      errors.amount = "Invalid amount is required";
    if (!accountId) errors.accountId = "Invalid account is required";
    if (!date || isNaN(date.getTime()))
      errors.date = "Invalid date is required";
    if (category === "Software Licenses" && !softwareName)
      errors.softwareName = "Invalid software name is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      toast.error("Invalid form submission");
      return;
    }
    setConfirmUpdateOpen(true);
  };

  const generateExpenseId = () =>
    `EXP-${Math.floor(1000 + Math.random() * 9000)}`;

  const confirmUpdate = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("No authenticated user found");
      setConfirmUpdateOpen(false);
      return;
    }

    const newExpense = {
      expenseId: editingExpense
        ? editingExpense.expenseId
        : generateExpenseId(),
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
      toast.error("Error saving expense occurred");
      console.error("Error occurred:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "expenses", deleteId));
      toast.success("Expense successfully deleted");
      setConfirmDeleteOpen(false);
    } catch (error) {
      toast.error("Error deleting expense occurred");
      console.error("Error occurred:", error);
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

  // Form styles from ManageClient.jsx
  const formContainerStyle = {
    backgroundColor: "#fff",
    borderRadius: "15px",
    boxShadow: "0 0 20px rgba(0, 0,0,0.2)",
    padding: "10px 20px",
    width: "100%",
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
    marginBottom: "15px",
    padding: "10px",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "5px",
    fontSize: "12px",
    backgroundColor: "#fff",
  };

  const buttonStyle = {
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
  };

  const titleStyle = {
    fontSize: "x-large",
    textAlign: "center",
    color: "#333",
  };

  if (loadingRoles) {
    return <Box>Loading...</Box>;
  }

  if (!hasAccess) {
    return <Navigate to="/unauthorized" />;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      {" "}
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
          }}
        />
        <MDBox
          p={3}
          sx={{
            marginLeft: { xs: "0", md: miniSidenav ? "80px" : "250px" },
            marginTop: { xs: "140px", md: "100px" },
            backgroundColor: darkMode
              ? "background.default"
              : "background.paper",
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
                  <MDTypography
                    variant="h6"
                    color={darkMode ? "white" : "white"}
                  >
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
                      <>
                        <MDButton
                          variant="gradient"
                          color={darkMode ? "dark" : "info"}
                          onClick={handleClickOpen}
                        >
                          Add Expense
                        </MDButton>
                        <FormControl sx={{ minWidth: 150 }}>
                          <InputLabel
                            id="excel-options-label"
                            sx={{ color: darkMode ? "white" : "black" }}
                          >
                            Excel Options
                          </InputLabel>
                          <Select
                            labelId="excel-options-label"
                            value={excelOption}
                            onChange={handleExcelOptionChange}
                            label="Excel Options"
                            sx={{
                              height: "36px",
                              "& .MuiSelect-select": {
                                padding: "8px",
                                color: darkMode ? "white" : "black",
                              },
                              "& .MuiSvgIcon-root": {
                                color: darkMode ? "white" : "black",
                              },
                            }}
                          >
                            <MenuItem value="" disabled>
                              Select an option
                            </MenuItem>
                            <MenuItem value="upload">Upload Excel</MenuItem>
                            <MenuItem value="download">Download Excel</MenuItem>
                            <MenuItem value="downloadDummy">
                              Download Dummy Excel
                            </MenuItem>
                          </Select>
                        </FormControl>
                        <input
                          id="file-upload"
                          type="file"
                          hidden
                          accept=".xlsx, .xls, .csv"
                          onChange={handleFileUpload}
                        />
                      </>
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
                        "& .MuiInputLabel-root": {
                          color: darkMode ? "white" : "black",
                        },
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
                          "& .MuiSvgIcon-root": {
                            color: darkMode ? "white" : "black",
                          },
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
                                  backgroundColor: darkMode
                                    ? "#424242"
                                    : "#fff",
                                  color: darkMode ? "white" : "black",
                                },
                                "& .MuiInputLabel-root": {
                                  color: darkMode ? "white" : "black",
                                },
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
                                  backgroundColor: darkMode
                                    ? "#424242"
                                    : "#fff",
                                  color: darkMode ? "white" : "black",
                                },
                                "& .MuiInputLabel-root": {
                                  color: darkMode ? "white" : "black",
                                },
                              }}
                            />
                          )}
                        />
                      </>
                    )}
                  </Box>
                </MDBox>

                {loadingData ? (
                  <Box p={3} sx={{ textAlign: "center" }}>
                    <Typography>Loading...</Typography>
                  </Box>
                ) : filteredExpenses.length === 0 ? (
                  <Box p={3} sx={{ textAlign: "center" }}>
                    <Typography>No expenses were found</Typography>
                  </Box>
                ) : (
                  <Grid container spacing={3} xs={{ padding: "16px" }}>
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
            backgroundColor: darkMode
              ? "background.default"
              : "background.paper",
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
              fullWidth
              sx={{
                "& .MuiDialog-paper": {
                  backgroundColor: "#f3f3f3",
                  borderRadius: "8px",
                  boxShadow: "0 0 20px rgba(0, 0, 0, 0.2)",
                  width: "400px",
                  margin: "auto",
                },
              }}
            >
              <DialogTitle sx={{ ...titleStyle }}>
                {editingExpense ? "Edit expense" : "Add expense"}
              </DialogTitle>
              <DialogContent sx={{ padding: "10px 20px" }}>
                <fieldset style={formStyle}>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSubmit();
                    }}
                  >
                    <label style={labelStyle} htmlFor="category">
                      Category*
                    </label>
                    <select
                      style={{
                        ...selectStyle,
                        borderColor: formErrors.category ? "red" : "#ddd",
                      }}
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        Select category
                      </option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    {formErrors.category && (
                      <span style={{ color: "red", fontSize: "12px" }}>
                        {formErrors.category}
                      </span>
                    )}

                    <label style={labelStyle} htmlFor="accountId">
                      Account*
                    </label>
                    <select
                      style={{
                        ...selectStyle,
                        borderColor: formErrors.accountId ? "red" : "#ddd",
                      }}
                      id="accountId"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        Select account
                      </option>
                      {accounts.map((acc) => (
                        <option key={acc.accountId} value={acc.accountId}>
                          {acc.accountName}
                        </option>
                      ))}
                    </select>
                    {formErrors.accountId && (
                      <span style={{ color: "red", fontSize: "12px" }}>
                        {formErrors.accountId}
                      </span>
                    )}

                    <label style={labelStyle} htmlFor="amount">
                      Amount*
                    </label>
                    <input
                      style={{
                        ...inputStyle,
                        borderColor: formErrors.amount ? "red" : "#ddd",
                      }}
                      type="number"
                      id="amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      required
                    />
                    {formErrors.amount && (
                      <span style={{ color: "red", fontSize: "12px" }}>
                        {formErrors.amount}
                      </span>
                    )}

                    <label style={labelStyle} htmlFor="date">
                      Date*
                    </label>
                    <input
                      style={{
                        ...inputStyle,
                        borderColor: formErrors.date ? "red" : "#ddd",
                      }}
                      type="date"
                      id="date"
                      value={date ? date.toISOString().substring(0, 10) : ""}
                      onChange={(e) =>
                        setDate(
                          e.target.value ? new Date(e.target.value) : null
                        )
                      }
                      required
                    />
                    {formErrors.date && (
                      <span style={{ color: "red", fontSize: "12px" }}>
                        {formErrors.date}
                      </span>
                    )}

                    <label style={labelStyle} htmlFor="description">
                      Description
                    </label>
                    <input
                      style={inputStyle}
                      type="text"
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter description"
                    />

                    <label style={labelStyle} htmlFor="projectId">
                      Project
                    </label>
                    <select
                      style={selectStyle}
                      id="projectId"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                    >
                      <option value="">None</option>
                      {projects.length === 0 ? (
                        <option disabled>No projects available</option>
                      ) : (
                        projects.map((proj) => (
                          <option key={proj.projectId} value={proj.projectId}>
                            {proj.projectName}
                          </option>
                        ))
                      )}
                    </select>

                    {category === "Salaries" && (
                      <>
                        <label style={labelStyle} htmlFor="employeeIds">
                          Employee
                        </label>
                        <div style={checkboxContainerStyle}>
                          {employeeIds.map((emp) => (
                            <div key={emp}>
                              <input
                                type="checkbox"
                                id={`emp-${emp}`}
                                checked={selectedEmployeeIds.includes(emp)}
                                onChange={() => {
                                  setSelectedEmployeeIds((prev) =>
                                    prev.includes(emp)
                                      ? prev.filter((id) => id !== emp)
                                      : [...prev, emp]
                                  );
                                }}
                              />
                              <label
                                htmlFor={`emp-${emp}`}
                                style={{ marginLeft: "8px", fontSize: "12px" }}
                              >
                                {emp}
                              </label>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {category === "Software Licenses" && (
                      <>
                        <label style={labelStyle} htmlFor="softwareName">
                          Software Name*
                        </label>
                        <input
                          style={{
                            ...inputStyle,
                            borderColor: formErrors.softwareName
                              ? "red"
                              : "#ddd",
                          }}
                          type="text"
                          id="softwareName"
                          value={softwareName}
                          onChange={(e) => setSoftwareName(e.target.value)}
                          placeholder="Enter software name"
                          required
                        />
                        {formErrors.softwareName && (
                          <span style={{ color: "red", fontSize: "12px" }}>
                            {formErrors.softwareName}
                          </span>
                        )}
                      </>
                    )}

                    <label style={labelStyle}>Recurring Expense</label>
                    <div style={checkboxContainerStyle}>
                      <input
                        type="checkbox"
                        id="recurring"
                        checked={recurring}
                        onChange={(e) => setRecurring(e.target.checked)}
                      />
                      <label
                        htmlFor="recurring"
                        style={{ marginLeft: "8px", fontSize: "12px" }}
                      >
                        Recurring
                      </label>
                    </div>
                  </form>
                </fieldset>
              </DialogContent>
              <DialogActions
                sx={{ padding: "16px 24px", justifyContent: "center" }}
              >
                <button style={buttonStyle} onClick={handleClose}>
                  Cancel
                </button>
                <button style={buttonStyle} onClick={handleSubmit}>
                  Save
                </button>
              </DialogActions>
            </Dialog>

            <Dialog
              open={confirmDeleteOpen}
              onClose={() => setConfirmDeleteOpen(false)}
              sx={{
                "& .MuiDialog-paper": {
                  backgroundColor: darkMode
                    ? "background.default"
                    : "background.paper",
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
                  backgroundColor: darkMode
                    ? "background.default"
                    : "background.paper",
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
