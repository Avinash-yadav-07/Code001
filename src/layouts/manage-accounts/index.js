import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Box,
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { db, auth } from "../manage-employee/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import Icon from "@mui/material/Icon";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useMaterialUIController } from "context";
import * as XLSX from "xlsx";
import AddIcon from "@mui/icons-material/Add";

const statuses = ["Active", "Closed"];
const industries = [
  "Technology",
  "Finance",
  "Healthcare",
  "Retail",
  "Manufacturing",
];

// Utility function to generate random numbers for IDs
const generateRandomNumber = () => Math.floor(1000 + Math.random() * 9000);

// Generate unique account ID
const generateAccountId = () => `ACC-${generateRandomNumber()}`;

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

const ManageAccount = () => {
  const [open, setOpen] = useState(false);
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [editingAccount, setEditingAccount] = useState(null);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [projectList, setProjectList] = useState([]);
  const [clientList, setClientList] = useState([]);
  const [accountExpenses, setAccountExpenses] = useState({});
  const [projectExpenses, setProjectExpenses] = useState({});
  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;
  const [userRoles, setUserRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [excelOption, setExcelOption] = useState("");
  const [errors, setErrors] = useState({});

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
    userRoles.includes("ManageAccount:read") &&
    !userRoles.includes("ManageAccount:full access");
  const hasAccess =
    userRoles.includes("ManageAccount:read") ||
    userRoles.includes("ManageAccount:full access");

  // Fetch all data (accounts, projects, clients, expenses) in a single batch
  const fetchAllData = useCallback(async () => {
    try {
      setFetchError(null);
      setLoadingData(true);
      const user = auth.currentUser;
      if (!user) {
        console.error("No authenticated user");
        setFetchError("No authenticated user. Please log in.");
        return;
      }

      // Batch fetch accounts, projects, clients, expenses
      const [
        accountsSnapshot,
        projectsSnapshot,
        clientsSnapshot,
        expensesSnapshot,
      ] = await Promise.all([
        getDocs(collection(db, "accounts")),
        getDocs(collection(db, "projects")),
        getDocs(collection(db, "clients")),
        getDocs(collection(db, "expenses")),
      ]);

      const accountsData = accountsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const projectsData = projectsSnapshot.docs.map((doc) => ({
        id: doc.id,
        projectId: doc.data().projectId || doc.id,
        name: doc.data().name || "Unknown",
      }));
      const clientsData = clientsSnapshot.docs.map((doc) => ({
        id: doc.id,
        clientId: doc.data().clientId || doc.id,
        name: doc.data().name || "Unknown",
      }));
      const expensesData = expensesSnapshot.docs.map((doc) => doc.data());

      // Process expenses
      const expensesMap = {};
      const projectExpensesMap = {};

      for (const account of accountsData) {
        if (account.accountId) {
          const accountExpenses = expensesData
            .filter((exp) => exp.accountId === account.accountId)
            .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
          expensesMap[account.accountId] = accountExpenses;

          // Calculate project expenses for this account
          const relatedExpenses = expensesData.filter(
            (exp) => exp.accountId === account.accountId && exp.projectId
          );
          relatedExpenses.forEach((exp) => {
            if (!projectExpensesMap[exp.projectId]) {
              projectExpensesMap[exp.projectId] = 0;
            }
            projectExpensesMap[exp.projectId] += Number(exp.amount) || 0;
          });
        }
      }

      // Update state
      setAccounts(accountsData);
      setProjectList(projectsData);
      setClientList(clientsData);
      setAccountExpenses(expensesMap);
      setProjectExpenses(projectExpensesMap);
    } catch (error) {
      console.error("Error fetching data:", error);
      setFetchError("Failed to fetch data. Please try again.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Trigger data fetch when roles are loaded
  useEffect(() => {
    if (!loadingRoles) {
      fetchAllData();
    }
  }, [loadingRoles, fetchAllData]);

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

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
          blankrows: false,
        });

        const validProjectIds = projectList.map((p) => p.id);
        const validClientIds = clientList.map((c) => c.id);

        // Normalize column names for Excel import
        const normalizeColumnName = (name) => {
          if (!name) return "";
          const cleanName = name.trim().toLowerCase().replace(/\s+/g, "");
          if (cleanName.includes("name") || cleanName.includes("accountname"))
            return "Name";
          if (cleanName.includes("industry")) return "Industry";
          if (cleanName.includes("project") || cleanName.includes("projects"))
            return "Projects";
          if (cleanName.includes("client") || cleanName.includes("clients"))
            return "Clients";
          if (cleanName.includes("status")) return "Status";
          if (cleanName.includes("notes")) return "Notes";
          return name;
        };

        const normalizedData = jsonData.map((row) => {
          const normalizedRow = {};
          Object.keys(row).forEach((key) => {
            normalizedRow[normalizeColumnName(key)] = row[key];
          });
          return normalizedRow;
        });

        for (const account of normalizedData) {
          let newAccountId = generateAccountId();
          let attempts = 0;
          const maxAttempts = 10;

          // Ensure unique account ID
          while (attempts < maxAttempts) {
            const isAccountIdUnique = await checkUniqueId(
              "accounts",
              "accountId",
              newAccountId
            );
            if (isAccountIdUnique) break;
            newAccountId = generateAccountId();
            attempts++;
          }

          if (attempts >= maxAttempts) {
            console.error(
              "Could not generate unique ID for account:",
              account["Name"]
            );
            alert(
              "Failed to generate unique ID for some accounts. Please try again."
            );
            return;
          }

          // Validate required fields
          if (
            !account["Name"]?.trim() ||
            !account["Industry"]?.trim() ||
            !account["Status"]?.trim()
          ) {
            console.error(
              "Missing required fields in account:",
              account["Name"]
            );
            alert(
              `Missing required fields for account ${
                account["Name"] || "unknown"
              }. Required: Name, Industry, Status.`
            );
            return;
          }

          // Validate industry
          const normalizedIndustry = account["Industry"].trim();
          if (
            !industries
              .map((i) => i.toLowerCase())
              .includes(normalizedIndustry.toLowerCase())
          ) {
            console.error("Invalid industry for account:", account["Name"]);
            alert(
              `Invalid industry "${account["Industry"]}" for account ${account["Name"]}.`
            );
            return;
          }

          // Validate status
          const normalizedStatus = account["Status"].trim();
          if (
            !statuses
              .map((s) => s.toLowerCase())
              .includes(normalizedStatus.toLowerCase())
          ) {
            console.error("Invalid status for account:", account["Name"]);
            alert(
              `Invalid status "${account["Status"]}" for account ${account["Name"]}.`
            );
            return;
          }

          // Process projects
          let projectIds = [];
          if (account["Projects"]) {
            projectIds = account["Projects"]
              .toString()
              .split(",")
              .map((id) => id.trim())
              .filter((id) => id && validProjectIds.includes(id));
          }

          // Process clients
          let clientIds = [];
          if (account["Clients"]) {
            clientIds = account["Clients"]
              .toString()
              .split(",")
              .map((id) => id.trim())
              .filter((id) => id && validClientIds.includes(id));
          }

          // Calculate financial metrics
          const currentExpenses = accountExpenses[newAccountId] || 0;
          const totalBudget = projectList
            .filter((project) => projectIds.includes(project.id))
            .reduce(
              (sum, project) =>
                sum + (Number(project.financialMetrics?.budget) || 0),
              0
            );
          const revenue = totalBudget - currentExpenses;
          const profitMargin =
            totalBudget > 0 ? (revenue / totalBudget) * 100 : 0;

          // Create new account object
          const newAccount = {
            accountId: newAccountId,
            name: account["Name"].trim(),
            industry: normalizedIndustry,
            revenue: revenue.toFixed(2),
            expenses: currentExpenses,
            profitMargin: profitMargin.toFixed(2),
            projects: projectIds,
            clients: clientIds,
            status: normalizedStatus,
            notes: account["Notes"]?.toString().trim() || "",
          };

          // Save account to Firestore
          try {
            const docRef = await addDoc(collection(db, "accounts"), newAccount);
            setAccounts((prev) => [...prev, { id: docRef.id, ...newAccount }]);
          } catch (error) {
            console.error("Error adding account from Excel:", error);
            alert(
              `Failed to add account ${account["Name"] || "unknown"}. Error: ${
                error.message
              }`
            );
            return;
          }
        }
        alert("Accounts imported successfully!");
        fetchAllData();
      } catch (error) {
        console.error("Error processing Excel file:", error);
        alert(
          "Failed to process Excel file. Please ensure it contains the required fields (Name, Industry, Status) and is in a valid format (.xlsx, .xls, .csv)."
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
    const exportData = accounts.map((account) => ({
      Name: account.name,
      Industry: account.industry,
      Revenue: account.revenue || 0,
      Expenses: accountExpenses[account.accountId] || 0,
      "Profit Margin": account.profitMargin || 0,
      Projects: Array.isArray(account.projects)
        ? account.projects
            .map((projectId) => {
              const project = projectList.find((p) => p.id === projectId);
              return project
                ? `${project.name} (${project.projectId})`
                : projectId;
            })
            .join(", ")
        : "",
      Clients: Array.isArray(account.clients)
        ? account.clients
            .map((clientId) => {
              const client = clientList.find((c) => c.id === clientId);
              return client ? `${client.name} (${client.clientId})` : clientId;
            })
            .join(", ")
        : "",
      Status: account.status,
      Notes: account.notes || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Accounts");
    XLSX.writeFile(workbook, "accounts_export.xlsx");
  };

  // Handle dummy Excel download
  const handleDownloadDummyExcel = () => {
    const dummyData = [
      {
        Name: "",
        Industry: "",
        Revenue: "",
        Expenses: "",
        "Profit Margin": "",
        Projects: "",
        Clients: "",
        Status: "",
        Notes: "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(dummyData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Accounts");
    XLSX.writeFile(workbook, "accounts_dummy.xlsx");
  };

  const handleClickOpen = () => {
    setOpen(true);
    resetForm();
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setName(account.name || "");
    setIndustry(account.industry || "");
    setProjects(Array.isArray(account.projects) ? account.projects : []);
    setClients(Array.isArray(account.clients) ? account.clients : []);
    setStatus(account.status || "");
    setNotes(account.notes || "");
    setErrors({});
    setOpen(true);
  };

  // Validate form inputs
  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!industry) newErrors.industry = "Industry is required";
    if (!status) newErrors.status = "Status is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      setConfirmUpdateOpen(true);
    }
  };

  const confirmUpdate = async () => {
    let accountId = editingAccount
      ? editingAccount.accountId
      : generateAccountId();
    let attempts = 0;
    const maxAttempts = 10;

    if (!editingAccount) {
      while (attempts < maxAttempts) {
        const isAccountIdUnique = await checkUniqueId(
          "accounts",
          "accountId",
          accountId
        );
        if (isAccountIdUnique) break;
        accountId = generateAccountId();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        console.error("Could not generate unique account ID");
        alert("Failed to generate unique Account ID. Please try again.");
        setConfirmUpdateOpen(false);
        return;
      }
    }

    const currentExpenses = accountExpenses[accountId] || 0;
    const totalBudget = projectList
      .filter((project) => projects.includes(project.id))
      .reduce(
        (sum, project) => sum + (Number(project.financialMetrics?.budget) || 0),
        0
      );
    const revenue = totalBudget - currentExpenses;
    const profitMargin = totalBudget > 0 ? (revenue / totalBudget) * 100 : 0;

    const newAccount = {
      accountId,
      name,
      industry,
      revenue: revenue.toFixed(2),
      expenses: currentExpenses,
      profitMargin: profitMargin.toFixed(2),
      projects,
      clients,
      status,
      notes,
    };

    try {
      if (editingAccount) {
        await updateDoc(doc(db, "accounts", editingAccount.id), newAccount);
        setAccounts(
          accounts.map((acc) =>
            acc.id === editingAccount.id ? { ...acc, ...newAccount } : acc
          )
        );
      } else {
        const docRef = await addDoc(collection(db, "accounts"), newAccount);
        setAccounts([...accounts, { id: docRef.id, ...newAccount }]);
      }
      setConfirmUpdateOpen(false);
      handleClose();
      fetchAllData();
    } catch (error) {
      console.error("Error saving account:", error);
      alert("Failed to save account. Please try again.");
    }
  };

  const resetForm = () => {
    setName("");
    setIndustry("");
    setProjects([]);
    setClients([]);
    setStatus("");
    setNotes("");
    setEditingAccount(null);
    setErrors({});
  };

  // Handle checkbox selection for projects and clients
  const handleSelectionChange = (id, type) => {
    if (type === "project") {
      if (projectList.some((project) => project.id === id)) {
        setProjects((prev) =>
          prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
      }
    } else if (type === "client") {
      if (clientList.some((client) => client.id === id)) {
        setClients((prev) =>
          prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
      }
    }
  };

  // Styles for form elements
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
    color: "#327c35",
  };

  const renderAccountCard = (account) => {
    const displayedRevenue = account.revenue || 0;

    return (
      <Grid item xs={12} key={account.id}>
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
              sx={{
                fontWeight: "bold",
                color: darkMode ? "#fff" : "#333",
                mb: 2,
              }}
            >
              {account.name}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <MDTypography
                  variant="body2"
                  color={darkMode ? "white" : "textSecondary"}
                >
                  <strong>ID:</strong> {account.accountId}
                </MDTypography>
                <MDTypography
                  variant="body2"
                  color={darkMode ? "white" : "textSecondary"}
                >
                  <strong>Industry:</strong> {account.industry}
                </MDTypography>
                <MDTypography
                  variant="body2"
                  color={darkMode ? "white" : "textSecondary"}
                >
                  <strong>Revenue:</strong> ${displayedRevenue}
                </MDTypography>
                <MDTypography
                  variant="body2"
                  color={darkMode ? "white" : "textSecondary"}
                >
                  <strong>Expenses:</strong> $
                  {accountExpenses[account.accountId] || 0}
                </MDTypography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <MDTypography
                  variant="body2"
                  color={darkMode ? "white" : "textSecondary"}
                >
                  <strong>Profit Margin:</strong> {account.profitMargin || 0}%
                </MDTypography>
                <MDTypography
                  variant="body2"
                  color={darkMode ? "white" : "textSecondary"}
                >
                  <strong>Projects:</strong>{" "}
                  {Array.isArray(account.projects) &&
                  account.projects.length > 0
                    ? account.projects
                        .map((projectId) => {
                          const project = projectList.find(
                            (p) => p.id === projectId
                          );
                          return project
                            ? `${project.name} (${project.projectId})`
                            : projectId;
                        })
                        .join(", ")
                    : "No projects assigned"}
                </MDTypography>
                <MDTypography
                  variant="body2"
                  color={darkMode ? "white" : "textSecondary"}
                >
                  <strong>Clients:</strong>{" "}
                  {Array.isArray(account.clients) && account.clients.length > 0
                    ? account.clients
                        .map((clientId) => {
                          const client = clientList.find(
                            (c) => c.id === clientId
                          );
                          return client
                            ? `${client.name} (${client.clientId})`
                            : clientId;
                        })
                        .join(", ")
                    : "No clients assigned"}
                </MDTypography>
                <MDTypography
                  variant="body2"
                  color={darkMode ? "white" : "textSecondary"}
                >
                  <strong>Status:</strong>{" "}
                  <Chip
                    label={account.status}
                    sx={{
                      backgroundColor:
                        account.status === "Active" ? "#4CAF50" : "#F44336",
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
          {!isReadOnly && (
            <CardActions sx={{ display: "flex", justifyContent: "flex-end" }}>
              <MDButton
                variant="gradient"
                color={darkMode ? "dark" : "info"}
                onClick={() => handleEdit(account)}
                sx={{ fontWeight: "bold" }}
              >
                <Icon fontSize="medium">edit</Icon> Edit
              </MDButton>
            </CardActions>
          )}
        </Card>
      </Grid>
    );
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
          backgroundColor: darkMode
            ? "rgba(33, 33, 33, 0.9)"
            : "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          zIndex: 1100,
          padding: "0 16px",
          minHeight: "60px",
          top: "8px",
          left: { xs: "0", md: miniSidenav ? "80px" : "260px" },
          width: {
            xs: "100%",
            md: miniSidenav ? "calc(100% - 80px)" : "calc(100% - 260px)",
          },
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
                <MDTypography variant="h6" color={darkMode ? "white" : "black"}>
                  Account Management
                </MDTypography>
              </MDBox>
              {!isReadOnly && (
                <MDBox pt={2} pb={2} px={2}>
                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      mb: 1,
                      alignItems: "center",
                    }}
                  >
                    <Button
                      variant="gradient"
                      color={darkMode ? "dark" : "info"}
                      onClick={handleClickOpen}
                      startIcon={<AddIcon />}
                      sx={{
                        textTransform: "none",
                        fontWeight: "medium",
                        boxShadow: 3,
                        "&:hover": {
                          boxShadow: 6,
                          backgroundColor: darkMode ? "grey.700" : "info.dark",
                        },
                      }}
                    >
                      Add Account
                    </Button>
                    <FormControl sx={{ minWidth: 150 }}>
                      <InputLabel id="excel-options-label">
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
                  </Box>
                </MDBox>
              )}
              <Grid container spacing={3} sx={{ padding: "16px" }}>
                {accounts.length === 0 ? (
                  <Grid item xs={12}>
                    <MDTypography
                      variant="body2"
                      color={darkMode ? "white" : "textSecondary"}
                    >
                      No accounts available.
                    </MDTypography>
                  </Grid>
                ) : (
                  accounts.map((account) => renderAccountCard(account))
                )}
              </Grid>
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
              {editingAccount ? "Edit Account" : "Add Account"}
            </DialogTitle>
            <DialogContent sx={{ py: 2, padding: "10px 20px" }}>
              <fieldset style={formStyle}>
                <form action="#" method="get">
                  <label style={labelStyle} htmlFor="name">
                    Name*
                  </label>
                  <input
                    style={{
                      ...inputStyle,
                      borderColor: errors.name ? "red" : "#ddd",
                    }}
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter Name"
                    required
                  />
                  {errors.name && (
                    <span style={{ color: "red", fontSize: "12px" }}>
                      {errors.name}
                    </span>
                  )}

                  <label style={labelStyle} htmlFor="industry">
                    Industry*
                  </label>
                  <select
                    style={{
                      ...selectStyle,
                      borderColor: errors.industry ? "red" : "#ddd",
                    }}
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Select Industry
                    </option>
                    {industries.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  {errors.industry && (
                    <span style={{ color: "red", fontSize: "12px" }}>
                      {errors.industry}
                    </span>
                  )}

                  <label style={labelStyle}>Projects</label>
                  {loadingData ? (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        py: 2,
                      }}
                    >
                      <CircularProgress size={24} />
                    </Box>
                  ) : projectList.length === 0 ? (
                    <Typography sx={{ fontSize: "12px", color: "#555" }}>
                      No projects available
                    </Typography>
                  ) : (
                    <Box sx={checkboxContainerStyle}>
                      {projectList.map((project) => (
                        <FormControlLabel
                          key={project.id}
                          control={
                            <Checkbox
                              checked={projects.includes(project.id)}
                              onChange={() =>
                                handleSelectionChange(project.id, "project")
                              }
                              sx={{
                                "& .MuiSvgIcon-root": { fontSize: "20px" },
                              }}
                            />
                          }
                          label={project.name || project.id || "Unknown"}
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
                  )}
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{ display: "block", mt: 1 }}
                  >
                    Click to select or deselect projects
                  </Typography>

                  <label style={labelStyle}>Clients</label>
                  {loadingData ? (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        py: 2,
                      }}
                    >
                      <CircularProgress size={24} />
                    </Box>
                  ) : clientList.length === 0 ? (
                    <Typography sx={{ fontSize: "12px", color: "#555" }}>
                      No clients available
                    </Typography>
                  ) : (
                    <Box sx={checkboxContainerStyle}>
                      {clientList.map((client) => (
                        <FormControlLabel
                          key={client.id}
                          control={
                            <Checkbox
                              checked={clients.includes(client.id)}
                              onChange={() =>
                                handleSelectionChange(client.id, "client")
                              }
                              sx={{
                                "& .MuiSvgIcon-root": { fontSize: "20px" },
                              }}
                            />
                          }
                          label={client.name || client.id || "Unknown"}
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
                  )}
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{ display: "block", mt: 1 }}
                  >
                    Click to select or deselect clients
                  </Typography>

                  <label style={labelStyle} htmlFor="status">
                    Status*
                  </label>
                  <select
                    style={{
                      ...selectStyle,
                      borderColor: errors.status ? "red" : "#ddd",
                    }}
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Select Status
                    </option>
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {errors.status && (
                    <span style={{ color: "red", fontSize: "12px" }}>
                      {errors.status}
                    </span>
                  )}

                  <label style={labelStyle} htmlFor="notes">
                    Notes
                  </label>
                  <input
                    style={inputStyle}
                    type="text"
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter Notes"
                  />
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
            open={confirmUpdateOpen}
            onClose={() => setConfirmUpdateOpen(false)}
            sx={{
              "& .MuiDialog-paper": {
                backgroundColor: darkMode
                  ? "background.default"
                  : "background.paper",
                borderRadius: "12px",
              },
            }}
          >
            <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
              Ready to update account details?
            </DialogTitle>
            <DialogActions>
              <Button
                onClick={() => setConfirmUpdateOpen(false)}
                sx={{
                  color: darkMode ? "#ffffff" : "#000000",
                  textTransform: "none",
                  fontWeight: "bold",
                  fontSize: "16px",
                  padding: "8px 20px",
                  borderRadius: "8px",
                  border: darkMode ? "1px solid #ffffff" : "1px solid #000000",
                  "&:hover": {
                    backgroundColor: darkMode
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(0,0,0,0.1)",
                    color: darkMode ? "#ffffff" : "#000000",
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmUpdate}
                sx={{
                  backgroundColor: darkMode ? "#4fc3f7" : "#1976d2",
                  color: "#ffffff",
                  textTransform: "none",
                  fontWeight: "bold",
                  fontSize: "16px",
                  padding: "8px 20px",
                  borderRadius: "8px",
                  "&:hover": {
                    backgroundColor: darkMode ? "#29b6f6" : "#1565c0",
                  },
                }}
              >
                Confirm
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default ManageAccount;
